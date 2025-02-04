const express = require("express")
const User=require('../models/userSchema')
const router = express.Router();
const usercontroller = require('../controllers/user/userController');
const profilecontroller = require("../controllers/user/profileController")
const wishlistcontroller = require("../controllers/user/wishlistController")
const cartcontoller = require("../controllers/user/cartController")
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
    res.redirect('/')
});

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
router.get("/address",userAuth,profilecontroller.getAddress)
router.get("/add-address",userAuth,profilecontroller.getAddAddress)
router.post("/save-address",userAuth,profilecontroller.saveAddress)
router.get("/edit-address",userAuth,profilecontroller.editAddress)
router.post("/edit-address",userAuth,profilecontroller.postEditAddress)
router.get("/delete-address",userAuth,profilecontroller.deleteAddress)


// wishlist management
router.get("/addTowishlist",userAuth,wishlistcontroller.addToWishlist)
router.get("/wishlist",userAuth,wishlistcontroller.getWishlist)
router.delete("/removeFromWishlist",userAuth,wishlistcontroller.removeFromWishlist)

//Cart management
router.get("/cart",userAuth,cartcontoller.getCart)
router.post("/addToCart",userAuth,cartcontoller.addToCart)



module.exports=router