const express = require("express")
const User=require('../models/userSchema')
const router = express.Router();
const usercontroller = require('../controllers/user/userController');
const profilecontroller = require("../controllers/user/profileController")
const wishlistcontroller = require("../controllers/user/wishlistController")
const cartcontoller = require("../controllers/user/cartController")
const checkoutcontoller = require("../controllers/user/checkoutController")
const ordercontoller = require("../controllers/user/orderController")
const walletController = require('../controllers/user/walletController');

const passport = require("passport");
const {userAuth} = require('../middlewares/auth')

router.use(async(req, res, next) => {
    const userData = await User.findById(req.session.user);
    res.locals.user = userData || null;
    next();
});


// Error Management
router.get("/pageNotFound",usercontroller.pageNotFound)


// Sign up Management
router.get("/signup",usercontroller.loadsignup)
router.post("/signup",usercontroller.signup)
router.post("/verify-otp",usercontroller.verifyOtp)
router.post("/resend-otp",usercontroller.resendOtp)
router.get("/auth/google",passport.authenticate('google',{scope:['profile','email']}));
router.get("/auth/google/callback",passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{ 
    req.session.user=req.user
    res.redirect('/')});

// Login Management
router.get("/login",usercontroller.loadLogin)
router.post("/login",usercontroller.login)

// Home page & shopping page
router.get("/", usercontroller.loadHomepage)
router.get("/logout",usercontroller.logout)
router.get('/productdetails', usercontroller.getProductDetails);
router.get('/shop',userAuth, usercontroller.getShoppingPage);
router.get('/getFilteredData',userAuth, usercontroller.getFilterData);


// Profile Management
router.get("/forgot-password",profilecontroller.getForgotPassPage)
router.post("/forgot-email-valid",profilecontroller.forgotEmailValid)
router.post("/verify-passForgot-otp",profilecontroller.verifyForgotPassotp)
router.get("/reset-password",profilecontroller.getResetPassPage)
router.post("/resend-forgot-otp",profilecontroller.ResendOtp)
router.post("/reset-password",profilecontroller.postNewPassword)
router.get("/userProfile",userAuth,profilecontroller.userProfile)
router.post('/updateprofile',userAuth,profilecontroller.updateProfile);


// Address Management
router.get("/address",userAuth,profilecontroller.getAddress)
router.get("/add-address",userAuth,profilecontroller.getAddAddress)
router.post("/save-address",userAuth,profilecontroller.saveAddress)
router.get("/edit-address",userAuth,profilecontroller.editAddress)
router.post("/edit-address",userAuth,profilecontroller.postEditAddress)
router.get("/delete-address",userAuth,profilecontroller.deleteAddress)


// wishlist management
router.post("/addTowishlist",wishlistcontroller.addToWishlist)
router.get("/wishlist",userAuth,wishlistcontroller.getWishlist)
router.delete("/removeFromWishlist",userAuth,wishlistcontroller.removeFromWishlist)

//Cart management
router.get("/cart",userAuth,cartcontoller.getCart)
router.post("/addToCart",cartcontoller.addToCart)
router.post("/cart/updateCartQuantity",userAuth,cartcontoller.updateQuantity)
router.get("/showCart/remove",userAuth,cartcontoller.removeFromCart)   
router.get("/showCart/clearCart",userAuth,cartcontoller.clearCart)   

// CheckOut management
router.get("/getCheckOut",userAuth,checkoutcontoller.getCheckOut)   
router.post("/place-order-initial",userAuth,checkoutcontoller.placeOrderInitial )   
router.post("/create-order",userAuth,checkoutcontoller.createOrder )   
router.get("/order-confirmation",userAuth,checkoutcontoller.orderConfirm)   
router.get("/payment-failed",userAuth,checkoutcontoller.paymentFailed)   
router.post('/retry-payment',userAuth,checkoutcontoller.retryPayment);
router.post("/verify-payment",userAuth,checkoutcontoller.verifyPayment)   
router.post("/place-order",userAuth,checkoutcontoller.placeOrder) 
router.post('/wallet-payment',checkoutcontoller.walletPayment);  

// order management
router.get("/orders",userAuth,ordercontoller.getOrders)   
router.get('/cancel-order',userAuth,ordercontoller.getOrderCancel)
router.post('/return-request',userAuth,ordercontoller.returnRequest)
router.get('/order-details',userAuth,ordercontoller.getOrderDetails)
router.get('/download-invoice',userAuth,ordercontoller.downloadInvoice)



// Coupon Management
router.get('/coupons',userAuth,ordercontoller.getCoupons)
router.post('/apply-coupon',userAuth,ordercontoller.applyCoupon)
router.post('/remove-coupon',userAuth,ordercontoller.removeCoupon);

// Wallet Mangement
router.get('/wallet',userAuth, walletController.loadWallet);
router.post('/create-wallet',userAuth,walletController.createWallet)



module.exports=router