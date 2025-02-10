const Cart =require("../../models/cartSchema");
const Product = require("../../models/productSchema");


const addToCart = async (req,res) => {
    try {

        const userId = req.session.user;
        const productId =req.query.productId;
        const qty = parseInt(req.query.quantity,10)

        if(!userId){
            console.log("user not found");
             return res.status(404).json({redirectUrl: '/login', status: 404})
            
        }

        if(!productId && !qty){
            console.log("productId or qty not found");
        }
        console.log(productId);
        

        const productData = await Product.findOne({_id:productId})
        if(!productData){
            console.log(`Product with ID ${productId} not found`);
            return res.status(404).redirect("/pageNotFound");
        }

        if(productData.quantity==0 || productData.quantity<qty){
            console.log(`Insufficient stock for product ID ${productId}.`);
         return res.status(400).json({message:"Insufficient or out of stock"})   
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
const updateQuantity = async (req, res) => {
    const { productId, change } = req.body;
    try {

        const userId = req.session.user;
        if (!userId) {
            return res.json({ success: false, message: "User not logged in" });
        }

        const cart = await Cart.findOne({ userId: userId });
        if (!cart) {
            return res.json({ success: false, message: "Cart not found" });
        }

        const item = cart.items.find((item) => item.productId.toString() === productId);
        if (item) {
            item.quantity += change;
            item.totalPrice = item.quantity * item.price;

            if (item.quantity <= 0) {
                cart.items = cart.items.filter((item) => item.productId.toString() !== productId);
            }

            cart.totalPrice = cart.items.reduce((total, item) => total + item.totalPrice, 0);
            await cart.save();

            res.json({
                success: true,
                newQuantity: item.quantity,
                newSubtotal: item.totalPrice,
                totalPrice: cart.totalPrice,
            });
        } else {
            res.json({ success: false, message: "Item not found in cart" });
        }

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Failed to update quantity" });
    }
};

const removeFromCart = async (req,res) => {
    try {

        const itemId = req.query.id;
        const userId = req.session.user;

        let cart = await Cart.findOneAndUpdate({userId : userId},{$pull:{items:{_id:itemId}}});

        console.log(cart);
        

        res.redirect("/cart")
        
    } catch (error) {
       console.log("Error removing the product",error);
        
    }
}

const clearCart = async (req,res) => {
    try {

        const userId = req.session.user;
        let cart = await Cart.findOne({userId:userId})

        cart.items =[];

        await cart.save();

        res.redirect("/cart")
        
    } catch (error) {
        console.log("Error clearing cart",error);
        
    }
}





module.exports = {
    addToCart,
    getCart,
    updateQuantity,
    removeFromCart,
    clearCart,
}