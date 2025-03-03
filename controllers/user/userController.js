const User = require("../../models/userSchema");
const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const Brand = require("../../models/brandSchema")
const Wishlist = require("../../models/wishlistSchema")
const Wallet = require("../../models/walletSchema")
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt")


function generateReferalCode(length) {
    let result = '';
    const characters = 'abcdef0123456789';
  
    for (let i = 0; i < length; i++) {
      result += characters[Math.floor(Math.random() * characters.length)];
    }
  
    return result;
  
  }

const pageNotFound = async (req, res) => {

    try {
        res.render("page-404")
    } catch (error) {
        res.redirect("/pageNotFound")
    }

}


const loadHomepage = async (req, res) => {

    try {
        
        const user = req.session.user;
        const products = await Product.find({isBlocked:false}).populate('category')
        if(user){
            const userData= await User.findOne({_id:user})
            return res.render("home",{user:userData,products:products})
        }
        else{
            res.render("home",{products:products})
        }
        
    } catch (error) {
        console.error(error)
        console.log("home page not found");
        res.status(500).send("server error")

    }
}

const loadLogin = async (req, res) => {

    try {

        if(!req.session.user){
            res.render("login",{message:null})
        }else{
            res.redirect("/")
        }
        
    } catch (error) {
        
        console.log("Login page not found");
        res.status(500).send("server error");
    }
}

const login = async (req,res) => {

    try {
        const {email,password} = req.body;
        

        const findUser = await User.findOne({isAdmin:0,email:email});

        if(!findUser){
            return res.render('login',{message:"User not fuond"});
        }
        else if(findUser.isBlocked){
            return res.render('login',{message:"User is blocked by admin"});
        }

        const passwordMatch = await bcrypt.compare(password,findUser.password);

        if(!passwordMatch){
           return res.render("login",{message:"Incorrect Password"});
           
        }

        req.session.user = findUser.id;
        res.redirect("/")
        
    } catch (error) {

        console.log("login error",error);
        res.render("login",{message:"login failed. Please try again"});
        
        
    }
    
}

const logout = async (req,res) => {

    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("session destraction faild".err.message);
                return res.redirect("/pageNotFound");
            }
            return res.redirect("/login");
        })
    } catch (error) {
        console.log("logout error");
        res.redirect("/pageNotFound");
    }
    
}

const loadsignup = async (req, res) => {

    try {
        res.render("signup",{message:null})
    } catch (error) {
        console.log("Login page not found");
        res.status(500).send("server error")
    }
}

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {

    try {

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,

            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your OTP is ${otp}",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP is ${otp}</b>`
        })

        return info.accepted.length > 0

    } catch (error) {
        console.error(" error sending Otp email", error);
        return false;
    }

}

const signup = async (req, res) => {


    try {

        const { name, email, phone, password,referal, confirm_password } = req.body;

        if (password !== confirm_password) {
            return res.render("signup", { message: "Password do not match" });
        }

        const findUser = await User.findOne({ email });

        if (findUser) {
            return res.render("signup", { message: "User with this email already exist" });
        }

        const otp = generateOtp();

        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.json("email-error");
        }

        req.session.userOtp = otp;
        req.session.userData = { name,email,phone,referal,password }

        res.render("verify-otp");
        console.log("OTP sent : ", otp);



    } catch (error) {
        console.error(" error singing up", error);
        res.redirect("/pageNotFound");

    }
}


const securePassword = async (password) => {

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;

    } catch (error) {

    }
}

const verifyOtp = async (req, res) => {
    const { otp } = req.body;
    console.log("OTP entered : "+otp)

    try {
        if (otp == req.session.userOtp) {
            const user = req.session.userData
            // console.log(user);

            const passwordHash = await securePassword(user.password);
            const referalCode = generateReferalCode(8);

            let refererBonus = 120;
            let newUserBonus = 100;
            if (user.referal) {
                const refererUser = await User.findOne({ referalCode: user.referal });
        
                if (refererUser) {
                  await Wallet.findOneAndUpdate(
                    { userId: refererUser._id },
                    {
                      $inc: { balance: refererBonus },
                      $push: {
                        transactions: {
                          type: "Referal",
                          amount: refererBonus,
                          description: "Referral bonus for referring a new user"
                        }
                      }
                    },
                    { upsert: true }
                  );
                }
            }

            const saveUserData = new User({
                name: user.name,   
                email: user.email,
                phone: user.phone,
                password: passwordHash,
                referalCode
            });

            await saveUserData.save();
            await Wallet.create({
                userId: saveUserData._id,
                balance: user.referal ? newUserBonus : 0,
                transactions: user.referal
                  ? [{
                    type: "Referal",
                    amount: newUserBonus,
                    description: "Referral bonus for signing up with a referral code"
                  }]
                  : []
              });
            req.session.user = saveUserData._id;

            return res.json({
                success: true,
                redirectUrl: '/'
            });
        }
        else {
            res.status(400).json({ suceess: false, message: "Invalid otp, Please try again" })
        }

    } catch (error) {
        console.error("Error Varifying Otp",error);
        res.status(500).json({ success: false, message: "An error occured" })
    }

}

const resendOtp = async (req,res) => {

    try {
        
        const {email} = req.session.userData;
        if(!email){
            return req.status(400).json({success:false,message:"Email not found in session"})
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email,otp);

        if(emailSent){
            console.log("Resend Otp : "+otp);
            res.status(200).json({success:true,message:"OTP Resend Successfully"})
        }
        else{
            res.status(200).json({success:false,message:"Faild to Resent OTP. please try again"})
        }

    } catch (error) {
        console.error("Error resending OTP");
        res.status(200).json({success:false,message:"Internal sever Error"})
    }
    
}

const getShoppingPage = async (req,res) => {
    try {
        const user = req.session.user;
        const categories = await Category.find({ isListed: true });

        // Get filter parameters
        const { category, minPrice, maxPrice, page = 1 } = req.query;
        const limit = 8; // Number of products per page
        const skip = (page - 1) * limit;

        // Build filter conditions
        let filterConditions = { isBlocked: false, quantity: { $gt: 0 } };

        if (category) filterConditions.category = category;
        if (minPrice || maxPrice) {
            filterConditions.salePrice = {};
            if (minPrice) filterConditions.salePrice.$gte = parseFloat(minPrice);
            if (maxPrice) filterConditions.salePrice.$lte = parseFloat(maxPrice);
        }

        const totalProducts = await Product.countDocuments(filterConditions);
        const productData = await Product.find(filterConditions)
            .populate('category')
            .sort({ createOn: -1 }) // Newest first
            .skip(skip)
            .limit(limit);
            
            

        const totalPages = Math.ceil(totalProducts / limit);
        
        

        let wishlistProductIds = [];
        if (user) {
            const wishlist = await Wishlist.findOne({ userId: user }, { 'Products.productId': 1, _id: 0 });
            wishlistProductIds = wishlist ? wishlist.Products.map(item => item.productId.toString()) : [];
        }
        
        
        res.render('shop', {
            user,
            products: productData,
            totalPages,
            currentPage: parseInt(page),
            wishlistProductIds,
            categories,
            
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.redirect('/pageNotFound');
    }
}

const getProductDetails = async (req, res) => {
    try {
  
      const userId = req.session.user;
      const user = await User.findById(userId);
      const id = req.query.id;
      const productData = await Product.findOne({ _id: id });
      const category = await Category.findOne({ _id: productData.category });
      const brand = await Brand.findOne({ brandName: productData.brand });
      
      
  
      const productOffer = productData ? productData.productOffer || 0 : 0;
      const categoryOffer = category ? category.categoryOffer || 0 : 0;
      const highestOffer = Math.max(productOffer, categoryOffer);
      const discount = (productData.regularPrice * highestOffer) / 100;
      const finalSalePrice = productData.regularPrice - discount;
      
  
      const recommendedProducts = await Product.find({
        category: productData.category,
        _id: { $ne: productData._id }
      }).limit(4);
  
      res.render('product-details', {
        product: productData,
        category: category,
        brand:brand,
        recProducts: recommendedProducts,
        user: user,
        finalSalePrice: Math.floor(finalSalePrice),
        highestOffer
      });
  
    } catch (error) {
        console.error(error);
        
      res.redirect('/pageNotFound')
    }
  }

  const  getFilterData=async (req, res) => {
    const { category = 'all', search = '', sort = 'default', page = 1, limit = 8 } = req.query;

    try {
        const categoryId=await Category.findOne({name:category})
        // Build a query object
        const query = category === 'all' ? {} : { category:categoryId._id };
         

        // Add search filter to the query
        if (search) {
            query.productName = { $regex: search, $options: 'i' }; // Case-insensitive search
        }
        query.isBlocked=false;

        // Determine the sort order
        let sortCriteria = {};
        switch (sort) {
            
            case 'price-low':
                sortCriteria.salePrice = 1; // Ascending
                break;
            case 'price-high':
                sortCriteria.salePrice = -1; // Descending
                break;
            
            case 'az':
                sortCriteria.productName = 1; // Alphabetical A-Z
                break;
            case 'za':
                sortCriteria.productName = -1; // Alphabetical Z-A
                break;
            case 'new':
                sortCriteria.createdAt = -1; // Newest first
                break;
            default:
                sortCriteria = {}; // Default sorting (no specific order)
        }

        // Fetch products with filtering and sorting applied
        const products = await Product.find(query).sort(sortCriteria).skip((page - 1) * limit).limit(Number(limit));
         
        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);
        
        
        // Send the filtered and sorted products as JSON
        res.json({
            success: true,
            products, 
            totalPages,
            currentPage: Number(page)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching products',
            error: error.message,
        });
    }
}






module.exports = {
    loadHomepage,
    pageNotFound,
    loadLogin,
    login,
    logout,
    loadsignup,
    signup,
    verifyOtp,
    resendOtp,
    getShoppingPage,
    getFilterData,
    getProductDetails
}