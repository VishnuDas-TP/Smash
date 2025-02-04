const Cart =require("../../models/cartSchema");
const Product = require("../../models/productSchema");


const addToCart = async (req,res) => {
    try {

        const userId = req.session.user;
        const productId =req.query.productId;
        const qty = parseInt(req.query.quantity,10)

        if(!productId && !qty){
            console.log("productId or qty not found");
        }

        const productData = await Product.findOne({_id:productId})
        if(!productData){
            console.log(`Product with ID ${productId} not found`);
            return res.status(404).redirect("/pageNotFound");
        }

        if(productData.quantity<qty){
            console.log(`Insufficient stock for product ID ${productId}.`);
         res.redirect("/showcCart");   
        }

        const price = productData.salePrice;
        const totalPrice = price * qty;
       
        

        //find user Cart
        let cart = await Cart.findOne({userId : userId});

        if (cart) {
            const productIndex = cart.items.findIndex(
                (item) => item.productId.toString() === productId
            );

            if (productIndex >= 0) {
                // Update existing product in cart
                const existingQuantity = cart.items[productIndex].quantity;

                if (productData.quantity < existingQuantity + qty ||(existingQuantity+qty)>5) {
                    console.log( `Not enough stock to add ${qty} units for product ID ${productId}.`);
                    return res.json({message:"Not Enough Stock"})
                    // return res.redirect('/showCart');   
                }

                cart.items[productIndex].quantity += qty;
                cart.items[productIndex].totalPrice += totalPrice;

                console.log(
                    `Updated cart item: Product ID ${productId}, Quantity: ${cart.items[productIndex].quantity}, Total Price: ${cart.items[productIndex].totalPrice}`
                );
            } else {
                // Add new product to cart
                cart.items.push({ productId, quantity: qty, price, totalPrice });
                console.log(`Added new product ID ${productId} to cart.`);
            }
        } else {
            // Create a new cart
            cart = new Cart({
                userId,
                items: [{ productId, quantity: qty, price, totalPrice }],
            });
            console.log(`Created a new cart for user ID ${userId}.`);
        }

        // Save the updated cart
        await cart.save();
        console.log(`Cart saved successfully for user ID ${userId}.`);
        res.status(200).json({message:"Added to Cart",status:200})
    } catch (error) {
        console.error('Error adding to cart:', );
        res.redirect('/pageError');
    }
};

const getCart= async (req,res) => {
    try {

        const userId = req.session.user;
        const cart = await Cart.findOne({userId:userId}).populate("items.productId")
        const products = cart.items

        if(!userId && !cart && !products){
            console.log("failed to get data");  
        }

        res.render("cart",{products})
        
    } catch (error) {
        console.error(error);
        
    }
}




module.exports = {
    addToCart,
    getCart,
}