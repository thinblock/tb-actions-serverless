'use strict';
const AWS = require('aws-sdk');
const ccxt = require('ccxt');
const axios = require('axios');

module.exports.transaction = async (event) => {
  var jobId = event.Records[0].Sns.Message;

  var jobURL = `http://jobs.service.thinblock.io/jobs/${jobId}?look_up=_id`;
  const { data: { actions: [ action ] } } = await axios.get(jobURL);

  const { params } = action;

  if (params.user_id === undefined || params.exchange === undefined ||
    params.symbol === undefined || params.side === undefined ||
    params.amount === undefined || params.price === undefined) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Requires user_id, exchange, symbol, side, amount, price'
      })
    };
  }

  const user = params.user_id;
  const exchangeName = params.exchange;
  let { symbol, side, amount, price } = params;
  let order = null;

  try {
    // add URL
    var url = `http://pair.service.thinblock.io/api/pairs?user_id=${user}&exchange=${exchangeName}`;
    const { key, secret } = (await axios.get(url)).data;

    const exchangeId = exchangeName
    , exchangeClass = ccxt[exchangeId]
    , exchange = new exchangeClass ({
        'apiKey': key,
        'secret': secret,
        'timeout': 30000,
        'enableRateLimit': true,
    });

    await exchange.loadMarkets();
    amount = exchange.amountToPrecision(symbol, amount);
    price = exchange.priceToPrecision(symbol, price);

    if (side === 'buy') {
      order = await exchange.createLimitBuyOrder(symbol, amount, price, { test: true });
    } else if (side === 'sell') {
      order = await exchange.createLimitSellOrder(symbol, amount, price, { test: true });
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Side should be "buy" or "sell"'
        })
      }; 
    }
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        order
      })
    };
  } catch (e) {
    console.log(e);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: e.message
      })
    };
  }
};
