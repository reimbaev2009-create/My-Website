// assets.js - Единый источник OTC-активов
const RAW_OTC_ASSETS = [
  "Polkadot OTC", "Chainlink OTC", "Solana OTC", "Toncoin OTC", "Polygon OTC",
  "Bitcoin ETF OTC", "Avalanche OTC", "Litecoin OTC", "Ethereum OTC", "Dogecoin OTC",
  "BNB OTC", "TRON OTC", "Cardano OTC", "Bitcoin OTC", "AED/CNY OTC",
  "AUD/CAD OTC", "AUD/CHF OTC", "AUD/USD OTC", "CAD/CHF OTC", "CHF/JPY OTC",
  "CHF/NOK OTC", "EUR/CHF OTC", "EUR/NZD OTC", "EUR/RUB OTC", "EUR/TRY OTC",
  "EUR/USD OTC", "GBP/AUD OTC", "GBP/USD OTC", "KES/USD OTC", "OMR/CNY OTC",
  "SAR/CNY OTC", "UAH/USD OTC", "USD/COP OTC", "USD/PHP OTC", "YER/USD OTC",
  "USD/CHF OTC", "USD/INR OTC", "AUD/JPY OTC", "BHD/CNY OTC", "NZD/JPY OTC",
  "GBP/JPY OTC", "CAD/JPY OTC", "USD/BRL OTC", "USD/THB OTC", "TND/USD OTC",
  "USD/BDT OTC", "AUD/NZD OTC", "EUR/JPY OTC", "USD/CAD OTC", "GBP/CAD OTC",
  "USD/JPY OTC", "USD/MXN OTC", "EUR/HUF OTC", "USD/IDR OTC", "USD/PKR OTC",
  "USD/RUB OTC", "NGN/USD OTC", "LBP/USD OTC", "USD/CNH OTC", "EUR/CAD OTC",
  "USD/ARS OTC", "MAD/USD OTC", "EUR/AUD OTC", "GBP/CHF OTC", "USD/EGP OTC",
  "USD/SGD OTC", "JOD/CNY OTC", "QAR/CNY OTC", "USD/DZD OTC", "EUR/GBP OTC",
  "NZD/USD OTC", "USD/CLP OTC", "ZAR/USD OTC", "USD/VND OTC", "USD/MYR OTC",
  "Brent Oil OTC", "WTI Crude Oil OTC", "Silver OTC", "Gold OTC", "Natural Gas OTC",
  "Palladium spot OTC", "Platinum spot OTC", "Cisco OTC", "Johnson & Johnson OTC", "Amazon OTC",
  "Alibaba OTC", "Citigroup Inc OTC", "Marathon Digital Holdings OTC", "FACEBOOK INC OTC", "GameStop Corp OTC",
  "Advanced Micro Devices OTC", "FedEx OTC", "American Express OTC", "Apple OTC", "VIX OTC",
  "Coinbase Global OTC", "Intel OTC", "Palantir Technologies OTC", "Pfizer Inc OTC", "Netflix OTC",
  "VISA OTC", "ExxonMobil OTC", "Boeing Company OTC", "Microsoft OTC", "McDonald's OTC", "Tesla OTC"
];

// Удаление дубликатов и сортировка
export const OTC_FOREX_ASSETS = Array.from(new Set(RAW_OTC_ASSETS));