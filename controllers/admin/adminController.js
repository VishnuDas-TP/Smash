const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { session } = require("passport");


const pageerror = async (req,res) => {
    res.render("admin-error")
    
}

const loadLogin =async (req,res) => {
    try {
        if(req.session.admin){
            return res.redirect("/admin/dashboard");
        }
        res.render("admin-login",{message:null});
        
    } catch (error) {
        
    }
    
}


const login = async (req,res) => {
    try {

        const {email,password} = req.body;
        const admin = await User.findOne({email,isAdmin:true});

        if (admin){
            const passwordMatch = bcrypt.compare(password,admin.password)

            if(passwordMatch){
                req.session.admin = true;
                return res.redirect("/admin")
            }
            else{
                return res.redirect("/admin/login")
            }

        }
        else{
            return res.redirect("/admin/login")
        }
        
    } catch (error) {
        console.log("login error",error);
        return res.redirect("/pageerror")
        
    }
    
}

const logout = async (req,res) => {

    try {
        
        req.session.destroy(err=>{
            if(err){
                console.log("error destroying sessison");
                return res.redirect("/pageerror")
            }else{
                res.redirect("/admin/login")
            }
        })
        
    } catch (error) {
        console.log("unexpected error during logout",error);
        res.redirect("/pageerror")
    }
    
}


const loadDashboard = async (req,res) => {
    
    if(req.session.admin){
        try {
            res.render("dashboard")
        
        } catch (error) {
            console.log(error)
            res.redirect("/pageerror");
            
        }
            
    }
    
}






module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout,

}