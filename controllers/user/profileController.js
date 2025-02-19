const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");


function generateOtp(){
    const digit = "1234567890";
    let otp ="";
    for(let i=0;i<6;i++){
        otp+=digit[Math.floor(Math.random()*10)];
    }
    return otp;
}

const sentVarificationEmail = async (email,otp) => {
    try {

        const transporter = nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const mailoptions = {
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Your OTP For password reset",
            text:`Your OTP is ${otp}`,
            html:`<b><h4>Your OTP : ${otp}</h4></b>`
        } 

        const info = await transporter.sendMail(mailoptions);
        console.log("Email sent :",info.messageId);
        return true;
        
        
        
    } catch (error) {
        console.error("Error sending email",error);
        return false;
        
    }
}

const securePassword = async (password) => {
    try {

        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash;
        
    } catch (error) {
        console.log(error);
        
    }
}




const getForgotPassPage = async (req,res) => {
    try {

        res.render("forgot-password");
        
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const forgotEmailValid  = async (req,res) => {
    try {

        const {email} = req.body;
        const findUser = await User.findOne({email:email});
        if(findUser){
            const otp = generateOtp();
            const emailSent = await sentVarificationEmail(email,otp); 
            if(emailSent){
                req.session.userOtp = otp;
                req.session.email = email;
                res.render("forgotPass-otp");
                console.log("OTP :",otp);
                
            }
            else{
                req.json({success:false,message:"Failed to send OTP.please try again"});
            }
        }
        else{
            res.render("forgot-password",{
                message:"User with this email dose not exist"
            });
        }
        
        
    } catch (error) {
       res.redirect("/pageNotFound") 
    }
}

const verifyForgotPassotp = async (req,res) => {
    try {
        const enteredOtp = req.body.otp;
        
        if(enteredOtp == req.session.userOtp){
            res.json({success:true,redirectUrl:"/reset-password"});
        }
        else{
            res.json({success:false,message:"OTP not mathing"});
        }
        
    } catch (error) {
        console.error(error);
        
        res.status(500).json({success:false,message:"An Error occured.Plese try agaain"});
    }
}

const getResetPassPage = async (req,res) => {
    try {

        res.render("reset-password");
        
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

const ResendOtp= async (req,res) => {
    try {

        const otp = generateOtp();
        req.session.userOtp = otp;
        const email = req.session.email;
        console.log("Resend OTP to email:",email);
        const emailSent = await sentVarificationEmail(email,otp);
        if(emailSent){
            console.log("Resend OTP :",otp);
            res.status(200).json({success:true,message:"Resend OTP successful"});
        }
        
        
    } catch (error) {
        console.error(error);
        
        res.status(500).json({success:false,message:"Internal server error"});
    }
} 

const postNewPassword = async (req,res) => {
    try {

        const  {newPass1,newPass2} = req.body;
        const email = req.session.email;
        
        
        if(newPass1 === newPass2){
            const passwordHash = await securePassword(newPass1);
            
            
            await User.updateOne(
                {email:email},
                {$set:{password:passwordHash}}
            )
            res.redirect("/login");
        }
        else{
            res.render("reset-password",{message:"password do not match"});
        }
        
    } catch (error) {
        console.error(error);
        res.redirect("/pageNotFound");
        
    }
}

const userProfile = async (req,res) => {
    try {

        const userId = req.session.user;
        const userData = await User.findById(userId);
        const addressData = await Address.findOne({userId:userId})
        res.render("profile",{
            user:userData,
            userAddress:addressData,
        });
        
    } catch (error) {
     console.error("Error for retrieve profile data",error);
     res.redirect("/pageNotFound")
        
    }
}

const getAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const addressData = await Address.findOne({ userId: userId })
        if (!addressData) {
            res.redirect('/add-Address')
        }


        res.render('address', { address: addressData.address })
    } catch (error) {

    }
}



const getAddAddress = async (req,res) => {
    try {
        const user = req.session.user
        if(!user){
           return res.redirect("/login")
        }
        else{
            res.render("add-address")
        }
        
        
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const saveAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findOne({ _id: userId })
       
        const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body
        
        const userAddress = await Address.findOne({ userId: userData._id })
        if (!userAddress) {
            const newAddress = new Address({
                userId: userData._id,
                address: [{ addressType, name, city, landMark:landMark, state, pincode, phone, altPhone }]

            })
            await newAddress.save()
        } else {
            userAddress.address.push({ addressType, name, city, landMark:landMark, state, pincode, phone, altPhone })
            await userAddress.save();

        }
        res.status(200).json({message:"Address saved successfully"})

    } catch (error) {
        console.error('error is addaddress', error);
        res.render('page-404')

    }
}

const editAddress = async (req,res) => {
    try {

        const addressId = req.query.id;
        const currAddress = await Address.findOne({'address._id':addressId})

        if(!currAddress){
            console.log("currAddress not found");
           return res.redirect("/pageNotFound")
        }

        const addressData = currAddress.address.find((item)=>{
            return item._id.toString() == addressId.toString();
        })
       
        res.render("edit-address",{
           address: addressData
        })
    
        
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const postEditAddress = async (req, res) => {
    try {
        const data = req.body
        const addressId = req.query.id;
        const user = req.session.user
        const findAddress = await Address.findOne({ 'address._id': addressId })
        if (!findAddress) {
            res.redirect('pageerror')
        }
        await Address.updateOne({ 'address._id': addressId }, {
            $set: {
                'address.$': {
                    _id: addressId,
                    addressType: data.addressType,
                    name: data.name,
                    city: data.city,
                    landMark: data.landMark,
                    state: data.state,
                    pincode: data.pincode,
                    phone: data.phone,
                    altPhone: data.altPhone


                }
            }
        })
        res.redirect('address')
    } catch (error) {

    }
}

const deleteAddress= async (req,res)=>{
    try {
        const addressId=req.query.id;
        const findAddress=await  Address.findOne({ 'address._id': addressId })
        if(!findAddress){
            return res.status(404).send('address is not found')


        }

        await Address.updateOne({'address._id':addressId},{$pull:{address:{_id:addressId}}})

        res.redirect('/address')

    } catch (error) {
        console.error('error delete address');
        res.redirect('/admin/pageerror')
        
    }
}
 


module.exports = {

    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassotp,
    getResetPassPage,
    ResendOtp,
    postNewPassword,
    userProfile,
    getAddress,
    getAddAddress,
    saveAddress,
    editAddress,
    postEditAddress,
    deleteAddress,
}