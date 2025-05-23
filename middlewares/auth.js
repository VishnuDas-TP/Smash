const { login } = require("../controllers/admin/adminController");
const User = require("../models/userSchema");


const userAuth = (req,res,next)=>{

    if (req.path === "/login") {
        return next();
    }

    if(req.session.user){
        User.findById(req.session.user)
        .then(data=>{
            if(data && !data.isBlocked){
                next();
            }
            else{
                res.redirect("/login")
            }
        }).catch(error=>{
            console.log("Error in user auth middleware",error);
            res.status(500).send("internal Server error");
            
        })
    }
    else{
        res.redirect("/login")
    }

}

const adminAuth = (req,res,next)=>{
        
    User.findById(req.session.admin)
    .then(data=>{
        if(data){
            next();
        }
        else{
            res.redirect("/admin/login")
        }
    })
    .catch(error=>{
        console.log("Error in adminauth middleware",error);
        res.status(500).send("internal server Error");
    })
}

module.exports = {
    userAuth,
    adminAuth
}