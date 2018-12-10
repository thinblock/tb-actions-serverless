'use strict';
const AWS = require('aws-sdk');
const ccxt = require('ccxt');
const axios = require('axios');

function publishSNS(result) {
  const topicArn = process.env.NOTIFY_TOPIC_ARN || 'arn:aws:sns:ap-southeast-1:156969275739:NOTIFY_CLIENT_APP';

  const sns = new AWS.SNS();
  const snsParams = {
    Message: JSON.stringify(result),
    Subject: "SNS from Transaction Lambda",
    TopicArn: topicArn
  };
  sns.publish(snsParams, context.done);
}

module.exports.transaction = async (event, context) => {
  const actionSNS = event.Records[0].Sns.TopicArn;

  // SNS has single record only https://stackoverflow.com/questions/33690231/when-lambda-is-invoked-by-sns-will-there-always-be-just-1-record
  // requires jobId in Message
  const jobId = event.Records[0].Sns.Message;
  const serviceBase = process.env.KEY_SERVICE_BASE_URL || 'http://pair.service.thinblock.io/';
  const jobBase = process.env.JOBS_SERVICE_BASE_URL || 'http://jobs.service.thinblock.io/';
  const result = {
    jobId,
    event: '',
    data: ''
  }

  const jobURL = `${jobBase}jobs/${jobId}?look_up=_id`;
  const { data: { actions } } = await axios.get(jobURL);

  // find appropriate action in job
  let actionIndex = -1;
  actions.forEach((element, index) => {
    if (element.action.sns_topic_arn === actionSNS) {
      actionIndex = index;
    }
  });

  if (actionIndex = -1) {
    // Couldn't find appropriate action in job
    result.event = null;
    result.data = 'transaction_failed: Action not found in job';
    publishSNS(result);
    return;
  }

  const { params, action } = actions[actionIndex];
  result.event = action.name;

  if (params.user_id === undefined || params.exchange === undefined ||
    params.symbol === undefined || params.side === undefined ||
    params.amount === undefined || params.price === undefined) {
    result.data = 'transaction_failed: Requires user_id, exchange, symbol, side, amount, price'
    publishSNS(result);
    return;
  }

  const user = params.user_id;
  const exchangeName = params.exchange;
  let { symbol, side, amount, price } = params;
  let order = null;

  try {
    const serviceURL = `${serviceBase}pairs?user_id=${user}&exchange=${exchangeName}`;
    const { key, secret } = (await axios.get(serviceURL)).data;

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
      result.data = 'transaction_failed: Side should be "buy" or "sell"';
      publishSNS(result);
      return;
    }

    result.data = 'transaction_completed: Success';
    publishSNS(result);
    return;
  } catch (e) {
    console.log(e);
    result.data = 'transaction_failed: Error';
    publishSNS(result);
    return;
  }
};
