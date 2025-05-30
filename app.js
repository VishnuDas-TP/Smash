const express = require("express");
const app = express();
const path = require("path");
const morgan = require('morgan')
const passport = require("./config/passport");
const env = require("dotenv").config();
const db = require("./config/db");
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");
const session = require("express-session");
db()


app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}))

app.use(passport.initialize());
app.use(passport.session());
// app.use(morgan());

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
})

app.set("view engine","ejs");
app.set("views",[path.join(__dirname,"views/user"),path.join(__dirname,"views/admin")]);
app.use(express.static(path.join(__dirname,"public")));

app.use("/",userRouter)
app.use("/admin",adminRouter)



app.listen(process.env.PORT,()=>{
    console.log("Server Running on 3000");
    
});



module.exports