import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import axios from "axios";
import Trade from "./tradeModel.js";
import { createObjectCsvWriter } from "csv-writer";

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("Mongo Connected"));

/* ADD TRADE */
app.post("/api/trades", async (req,res)=>{
  const trade = await Trade.create(req.body);
  res.json(trade);
});

/* GET TRADES */
app.get("/api/trades", async (req,res)=>{
  const trades = await Trade.find().sort({date:1});
  res.json(trades);
});

/* ANALYTICS */
app.get("/api/analytics", async (req,res)=>{
  const trades = await Trade.find();

  let total = trades.length;
  let wins = trades.filter(t=>t.result>0);
  let losses = trades.filter(t=>t.result<0);

  let net = trades.reduce((a,b)=>a+b.result,0);
  let grossProfit = wins.reduce((a,b)=>a+b.result,0);
  let grossLoss = Math.abs(losses.reduce((a,b)=>a+b.result,0));

  let winRate = total? (wins.length/total)*100:0;
  let profitFactor = grossLoss? grossProfit/grossLoss:0;

  let monthly = {};
  trades.forEach(t=>{
    let month = new Date(t.date).toISOString().slice(0,7);
    if(!monthly[month]) monthly[month]=0;
    monthly[month]+=t.result;
  });

  res.json({
    total,
    winRate,
    profitFactor,
    net,
    monthly
  });
});

/* PROP RULES */
app.post("/api/propfirm", async (req,res)=>{
  const trades = await Trade.find();
  const rules = req.body;

  let equity=0,peak=0,maxDD=0;
  let daily={};

  trades.forEach(t=>{
    equity+=t.result;
    if(equity>peak)peak=equity;
    let dd=peak-equity;
    if(dd>maxDD)maxDD=dd;

    let day=new Date(t.date).toISOString().slice(0,10);
    if(!daily[day])daily[day]=0;
    daily[day]+=t.result;
  });

  let dailyBreach = Object.values(daily)
     .some(v=>v<=-rules.dailyLossLimit);

  res.json({
    equity,
    maxDD,
    dailyBreach,
    maxDrawdownBreach: maxDD>=rules.maxDrawdown,
    profitTargetReached: equity>=rules.profitTarget
  });
});

/* EXPORT */
app.get("/api/export", async (req,res)=>{
  const trades = await Trade.find();

  const writer = createObjectCsvWriter({
    path:"journal.csv",
    header:[
      {id:"date",title:"Date"},
      {id:"direction",title:"Direction"},
      {id:"result",title:"Result"}
    ]
  });

  await writer.writeRecords(trades);
  res.download("journal.csv");
});

/* LIVE XAGUSD PRICE */
app.get("/api/price", async (req,res)=>{
  try{
    const response = await axios.get(
      "https://api.metals.live/v1/spot/silver"
    );
    res.json({price:response.data[0].price});
  }catch{
    res.json({price:null});
  }
});

app.listen(10000,()=>{
  console.log("Server running");
});
