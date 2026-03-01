import mongoose from "mongoose";

const tradeSchema = new mongoose.Schema({
  symbol:{type:String,default:"XAGUSD"},
  direction:String,
  entry:Number,
  sl:Number,
  tp:Number,
  rr:Number,
  result:Number,
  date:{type:Date,default:Date.now}
});

export default mongoose.model("Trade",tradeSchema);
