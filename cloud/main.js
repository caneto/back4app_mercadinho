const Product = Parse.Object.extend('Product');
const Category = Parse.Object.extend('Category');
const CartItem = Parse.Object.extend('CartItem');

// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", (request) => {
	return "Hello world from mercadinho!";
});

Parse.Cloud.define("get-product-list", async (req) => {
	const queryProducts = new Parse.Query(Product);

	// Condições da query 

	if(req.params.title != null) {
		queryProducts.fullText('title', req.params.title);
		//queryProducts.matches('title', '.*' + req.params.title + '.*')
	}

	if(req.params.categoryId != null) {
		const category = new Category();
		category.id = req.params.categoryId;

		queryProducts.equalTo('category', category);
	}

	const itemsPerPage = req.params.itemsPerPage || 20;
	if(itemsPerPage > 100) throw 'Quantidade invalida de itens por página';

	queryProducts.skip(itemsPerPage * req.params.page || 0);
	queryProducts.limit(itemsPerPage);

	queryProducts.include('category');

	const resultProducts = await queryProducts.find({useMasterKey: true});

	return resultProducts.map(function (p) {
		p = p.toJSON();
		return {
			id: p.objectId,
			title: p.title,
			description: p.description,
			price: p.price,
			unit: p.unit,
			picture: p.picture != null ? p.picture.url : null,
			category: {
				title: p.category.title,
				id: p.category.objectId
			},
		}
	});

});

Parse.Cloud.define("get-category-list", async (req) => {
	const queryCategory = new Parse.Query(Category);

	const resultCategory = await queryCategory.find({useMasterKey: true});

	return resultCategory.map(function (p) {
		p = p.toJSON();
		return {
			id: p.objectId,
			title: p.title,
		}
	});

});

Parse.Cloud.define('signup', async (req) => {
	if(req.params.fullname == null) throw "INVALID_FULLNAME";
	if(req.params.phone == null) throw "INVALID_PHONE";
	if(req.params.cpf == null) throw "INVALID_CPF";

	const user = new Parse.User();

	user.set('username', req.params.username);
	user.set('email', req.params.email);
	user.set('password', req.params.password);
	user.set('fullname', req.params.fullnam);
	user.set('phone', req.params.phone);
	user.set('cpf', req.params.cpf);

	try {
		const resultUser = await user.signUp(null, {useMasterKey: true});
		const userJson =resultUser.toJSON();

		return formatUser(userJson);
	} catch (e) {
		throw 'INVALID_DATA';
	}
});

Parse.Cloud.define('login', async (req) => {
	try {
		const user = await Parse.User.logIn(req.params.username, req.params.password);
		const userJson = user.toJSON();
		
		return formatUser(userJson);			
	} catch (e) {
		throw 'INVALID_CREDENTIALS';
	}
});

Parse.Cloud.define('validate-token', async (req) => {
	try {
		return formatUser(req.user.toJSON());
	} catch (e) {
		throw 'INVALID_TOKEN'
	}
});


Parse.Cloud.define('change-password', async (req) => {
	if(req.user == null) throw 'INVALID_USER';
	
	const user = await Parse.User.logIn(req.params.username, req.params.currentPassword);
	if(user.id != req.user.id) throw 'INVALID_USER';
	user.set('password', req.params.newPassword);
	await user.save(null, {useMasterKey: true});
});

Parse.Cloud.define('reset-password', async (req) => {
	await Parse.User.requestPasswordReset(req.params.email);
});

Parse.Cloud.define('add-item-to-cart', async (req) => {
	if(req.params.quantity == null) throw 'INVALID_QUANTITY';
	if(req.params.productId == null) throw 'INVALID_QUANTITY';

	const cartItem = new CartItem();
	cartItem.set('quantity', req.params.quantity);

	const product = new Product();
	product.id = req.params.productId;

	cartItem.set('product', product);
	cartItem.set('user', req.user);

	const savadItem = await cartItem.save(null, {useMasterKey: true});	

	return {
		"id": savadItem.id
	}
});

Parse.Cloud.define('modify-item-quantity', async (req) => {
	if(req.params.cartItemId == null) throw 'INVALID_CARDITEM';
	if(req.params.quantity == null) throw 'INVALID_QUANTITY';

	const cartItem = new CartItem();
	cartItem.id = req.params.cartItemId;

	if(req.params.quantity > 0) {
		cartItem.set('quantity', req.params.quantity);
		await cartItem.save(null, {useMasterKey: true});
	} else {
		await cartItem.destroy({useMasterKey: true});
	}	
});

Parse.Cloud.define('get-cart-items', async (req) => {
	const queryCartItems = new Parse.Query(CartItem);
	queryCartItems.equalTo('user', req.user);
	queryCartItems.include('product');
	const resultCartItems = await queryCartItems.find({useMasterKey: true});
	return resultCartItems;
});

function formatUser(userJson) {
	return {
		id: userJson.objectId,
		username: userJson.username,
		email: userJson.email,
		phone: userJson.phone,
		cpf: userJson.cpf,
		token: userJson.sessionToken,
	}
}