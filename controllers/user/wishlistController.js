const Wishlist = require("../../models/wishlistSchema");
const Category = require("../../models/categorySchema");



const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const productId = req.body.id;
        if (!userId && !productId) {
            console.log('userId or productId is missing');
            return res.redirect('/')
        }

        const wishlist = await Wishlist.findOne({ userId, "Products.productId": productId });
        // console.log(wishlist);


        if (wishlist) {
            // If the product exists, send a response to trigger SweetAlert
            return res.status(400).json({ status: 400, success: false, message: "Product is already in your wishlist!" });
        }

        // If not, add the product
        await Wishlist.updateOne(
            { userId },
            { $addToSet: { Products: { productId } } },
            { upsert: true } // Create wishlist if it doesn't exist
        );

        res.status(200).json({ status: 200, success: true, message: "Product added to wishlist!" });


    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, success: false, message: "Error adding product to wishlist" });

    }
}

const getWishlist = async (req, res) => {

    try {
        const userId = req.session.user;
        // console.log(userId);

        const wishlist = await Wishlist.findOne({ userId }).populate('Products.productId');

        
        if (!wishlist || wishlist.Products.length === 0) {
            return res.render('wishlist', { wishlistItems: [] });
        }
        // console.log(wishlist.Products);
        
        
        const wishlistItems = await Promise.all(wishlist.Products.map(async (item) => {
            const category = await Category.findOne({ _id: item.productId.category });
            let price = item.productId.salePrice;

            const categoryOffer = category.categoryOffer
        
            if(categoryOffer > item.productId.productOffer){
            
            price= item.productId.regularPrice - (  categoryOffer / 100 )  * item.productId.regularPrice
            // console.log("cateoofer : ",price);
        }
            
            return {
                id: item.productId,
                name: item.productId.productName,
                description: item.productId.description,
                price: price ,// You forgot to assign price earlier
                stock: item.productId.quantity > 0 ? 'In Stock' : 'Out of Stock',
                image: item.productId.productImage[0],
                stockStatus: item.productId.quantity > 0,
                category: category?.name // Optional: include category name if needed
            };
        }));
        

        res.render('wishlist', { wishlistItems });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).send('Internal server error');
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        console.log("removefromwishlist");

        const productId = req.query.id;
        const userId = req.session.user;

        await Wishlist.findOneAndUpdate(
            { userId: userId },
            { $pull: { Products: { productId } } }
        );
        res.json({ success: true, message: "Product deleted from wishlist!" });


    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error deleting  product from wishlist" });
    }
}



module.exports = {
    addToWishlist,
    getWishlist,
    removeFromWishlist
}