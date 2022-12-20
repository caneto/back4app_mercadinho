const Product = Parse.Object.extend('Product');
const Category = Parse.Object.extend('Category');

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
		return formatProduct(p);
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

function formatProduct(productJson) {
	return {
		id: productJson.objectId,
		title: productJson.title,
		description: productJson.description,
		price: productJson.price,
		unit: productJson.unit,
		picture: productJson.picture != null ? productJson.picture.url : null,
		category: {
			title: productJson.category.title,
			id: productJson.category.objectId
		},
	}
}

module.exports = {formatProduct}