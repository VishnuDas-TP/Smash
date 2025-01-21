const mongoose = require(mongoose);
const {Schema} = mongoose;


const wishlistSchema = new Schema({

    userId:{
        type:Schema.Type.ObjectId,
        ref:"User",
        required:true
    },
    Products:[
        {
        productId:{
            type:Schema.Type.ObjectId,
            ref:"User",
            required:true
        },
        addOn:{
            type:Date,
            default:Date.now
        }
        }
    ]
})


const Wishlist = mongoose.model("Wishlist",wishlistSchema);

module.exports = Wishlist;
