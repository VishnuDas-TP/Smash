const mongoose = require("mongoose");
const {Schema} = mongoose;
const {v4:uuidv4} = require("uuid");

const generateShortId = () => {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let shortId = "";
    for (let i = 0; i < 6; i++) {
      shortId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return shortId;
  };
  
  const AddressSchema = new Schema({
    addressType: { type: String, required: true },
    name: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    phone: { type: String, required: true },
    altPhone: { type: String },
  });


const orderSchema = new Schema({

    orderId:{
        type:String,
        default:()=>uuidv4(),
        unique:true
    },
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    orderItems:[
        {
        product:{
            type: Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        quantity:{
            type:Number,
            required:true
        },
        price:{
            type:Number,
            default:0
        },
        returnStatus: {
            type: String,
            default: 'Not Requested', 
            enum: ['Not Requested', 'Return Requested', 'Return Approved', 'Returned', 'Return Rejected'],
            
        }
        }
    ],
    totalPrice:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        default:0
    },
    finalAmount:{
        type:Number,
        required:true
    },
    address: {
        type: AddressSchema,
        require: true,
      },
    invoiceDate:{
        type:Date
    },
    paymentMethod: {
        type: String,
        required: true
    },
    paymentStatus: {
        type: String,
        required: true
    },
    orderStatus:{
        type:String,
        required:true,
        enum:["Pending","Processing","Shipped","Delivered","Cancelled","Return Requested","Returned"]
    },
    createdOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    couponApplied:{
        type:Boolean,
        default:false
    }


})


const Order = mongoose.model("Order",orderSchema);

module.exports = Order;

