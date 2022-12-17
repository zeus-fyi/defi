const TokenMock = artifacts.require('./utils/TokenMock.sol');
const DexBrokerage = artifacts.require('./DexBrokerage.sol');

var utils = require('web3-utils');
const Utils = require("./Utils.js");
var BigNumber = require('bignumber.js');

let owner;
let maker;
let taker;
let admin;
let feeAccount;

let exchange;

let token;
let oneToken = web3.utils.toWei(1, "ether");

let oneHundredTokens = web3.toWei(100, "ether");
let twoHundredTokens = web3.toWei(200, "ether");

let oneThousandTokens = web3.toWei(1000, "ether");

let twentyFiveTokens = web3.toWei(25, "ether");

let fiftyTokens = web3.toWei(50, "ether");

let etherAddress = '0x0000000000000000000000000000000000000000';

let oneHundredWei = web3.toWei(100, "wei");
let oneQuarterEther = web3.toWei(0.25, "ether");
let oneEther = web3.toWei(1, "ether");
let halfEther = web3.toWei(0.5, "ether");
let oneAndHalfEther = web3.toWei(1.5, "ether");
let twoEther = web3.toWei(2, "ether");
let oneQuarterFinney = web3.toWei(0.25, "finney");
let oneHalfFinney = web3.toWei(0.5, "finney");
let oneFinney = web3.toWei(1, "finney");
let twoFinney = web3.toWei(2, "finney");
let threeFinney = web3.toWei(3, "finney");
let tenFinney = web3.toWei(10, "finney");
let twentyFinney = web3.toWei(20, "finney");
let thirtyFinney = web3.toWei(30, "finney"); 

let makerFee = oneFinney;
let takerFee = twoFinney;

let nonce = 0;
let makerExpires = '10000';
const inactivityReleasePeriod = 20000;

contract('DexBrokerageTest', (accounts) => {

    beforeEach(async () => {
        owner       = accounts[0];
        maker       = accounts[1];
        taker       = accounts[2];        
        admin       = accounts[3];
        feeAccount  = accounts[4];
        maker2      = accounts[5];
        maker3      = accounts[6];

        tokenUSD = await TokenMock.new('USD', 'T1', 18);
        await tokenUSD.mint(maker, oneHundredTokens);
        await tokenUSD.mint(taker, oneHundredTokens);

        exchange = await DexBrokerage.new(makerFee, takerFee, feeAccount, inactivityReleasePeriod);

        await exchange.setAdmin(admin, true);

        token = await TokenMock.new('token', 'T1', 18);
        await token.mint(maker, oneHundredTokens);
        await token.mint(taker, oneHundredTokens);

    });
            
    //helper method
    let getRSV = function(signedMsg) {
        const r = signedMsg.substr(0, 66);
        const s = '0x' + signedMsg.substr(66, 64);
        const v = '0x' + signedMsg.substr(130, 2);
        const v_decimal = web3.toDecimal(v) + 27;
        return [r, s, v_decimal];
    };

    //fake nonce
    let getNonce = function() {
        nonce += 1;
        return nonce.toString();
    };

    function expectRevert(e, msg) {
        assert(e.message.search('revert') >= 0, msg);
    }

    // it(" SPECIAL TEST simple trade tokens<->eth works correctly and ether and gas fees match", async () => {

    //     //maker wants to sell tokens for ether
    //     await token.approve(exchange.address, oneToken, {from: maker});
    //     await exchange.depositToken(token.address, oneToken, {from: maker});

    //     // change exchange 
    //     //maker needs ether in the account for fees
    //     await exchange.deposit({from: maker, value: oneEther});

    //     //taker wants to give ether for tokens
    //     await exchange.deposit({from: taker, value: 20*oneEther});

    //     let orderNonce = getNonce();
    //     let tradeNonce = getNonce();

    //     //sign order
    //     let orderHash = utils.soliditySha3(exchange.address, etherAddress, 10*oneEther, 
    //         token.address, oneToken, makerExpires, orderNonce, maker);
    //     let signedOrderHash = await web3.eth.sign(maker, orderHash);
    //     let [r1, s1, v1] = getRSV(signedOrderHash);

    //     //sign trade
    //     let tradeHash = utils.soliditySha3(exchange.address, token.address, oneToken, 
    //         etherAddress, 10*oneEther, makerExpires, tradeNonce, taker);
    //     let signedTradeHash = await web3.eth.sign(taker, tradeHash);
    //     let [r2, s2, v2] = getRSV(signedTradeHash);

    //     const gasLimit = 4000000;
    //     const gasPrice = web3.toWei(1, 'gwei');
    //     const gasCost = gasLimit*gasPrice;

    //     //prepare arguments
    //     let tradeValues = [10*oneEther, oneToken, orderNonce, oneToken, 10*oneEther,
    //         makerExpires, tradeNonce, 10*oneEther, oneToken, makerExpires, gasCost];
    //     let tradeAddresses = [etherAddress, token.address, maker, taker];
    //     let v = [v1, v2];
    //     let rs = [r1, s1, r2, s2];

    //     //execute
    //     await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

    //     //let takerFeeDue = halfEther * 2 / 1000;
    //     let makerFeeDue = 10*oneEther * 1 / 1000;
        
    //     //maker
    //     assert(0 == (await exchange.balanceOf(token.address, maker)).toNumber(), "maker has zero tokens");
    //     assert(11*oneEther - makerFeeDue == (await exchange.balanceOf(etherAddress, maker)).toNumber(), "maker fees taken correctly");

    //     // //taker
    //     // assert(oneHundredTokens == (await exchange.balanceOf(token.address, taker)).toNumber(), "taker has all the tokens");
    //     // assert(halfEther - takerFeeDue - gasCost == (await exchange.balanceOf(etherAddress, taker)).toNumber(), "taker fees taken correctly");

    //     // //fees
    //     // assert(takerFeeDue + makerFeeDue + gasCost == (await exchange.balanceOf(etherAddress, feeAccount)).toNumber(), "all fees credited correctly");
    // });

  it("SPECIAL TEST double maker single taker trade eth<->tokens works correctly and ether and gas fees match", async () => {
        let _0_03ETH = web3.toWei(0.03, "ether");
        let _0_04ETH = web3.toWei(0.04, "ether");
        let _62_5_TOKENS = web3.toWei(0.00000000000625, "ether");
        let _15_TOKENS = web3.toWei(15, "ether");
        let _40_TOKENS = web3.toWei(40, "ether");
        let _0_1_ETHER = web3.toWei(0.1, "ether");
        let _0_052_ETHER = web3.toWei(0.052, "ether");
        let _25_TOKENS = web3.toWei(25, "ether");

        let _0_037_ETHER = web3.toWei(0.037, "ether");
        let _8_766_TOKENS = web3.toWei(8.736717827626919000, "ether"); // ORIG

        let _0_0195_ETHER = web3.toWei(0.0195, "ether");

        let _0_011357_ETHER = web3.toWei(0.0113577331759149, "ether"); // ORIG
            _0_011357_ETHER = web3.toWei(0.011357733175914994, "ether"); // MOD
        let TEST = web3.toWei(0.011357733175914995, "ether");
        // adds another 100 tokens to taker
        await token.mint(taker, oneHundredTokens);

        //maker one wants to transfer their ether for erc20 tokens
        await exchange.deposit({from: maker, value: oneEther});
        //maker 2
        await exchange.deposit({from: maker2, value: oneEther});

        await exchange.deposit({from: maker3, value: oneEther});

        //taker accepts a trade of their erc20 for ether
        await token.approve(exchange.address, twoHundredTokens, {from: taker});
        await exchange.depositToken(token.address, twoHundredTokens, {from: taker});
        //taker needs ether in the account for fees
        await exchange.deposit({from: taker, value: oneEther});

        let orderNonce = 4;
        let orderNonce2 = 3;
        let tradeNonce = 32;

/* tradeValues
[0] amountBuy
[1] amountSell
[2] makerNonce
[3] takerAmountBuy
[4] takerAmountSell
[5] takerExpires
[6] takerNonce
[7] makerAmountBuy
[8] makerAmountSell
[9] makerExpires
[10] gasCost
tradeAddressses
[0] tokenBuy
[1] tokenSell
[2] maker
[3] taker
*/

       // orderHash = (this), tokenBuy, makerAmountBuy, tokenSell, makerAmountSell, makerExpires, makerNonce, maker

        //sign order 1
        let orderHash = utils.soliditySha3(exchange.address, token.address, _15_TOKENS, 
            etherAddress, _0_03ETH, makerExpires, orderNonce, maker);
        let signedOrderHash = await web3.eth.sign(maker, orderHash);
        let [r1, s1, v1] = getRSV(signedOrderHash);

        //sign trade for order that equals both maker orders
        let tradeHashDUAL = utils.soliditySha3(exchange.address, etherAddress, _0_052_ETHER, 
            token.address, _40_TOKENS, makerExpires, tradeNonce, taker);
        let signedTradeHash = await web3.eth.sign(taker, tradeHashDUAL);
        let [r2, s2, v2] = getRSV(signedTradeHash);

        const gasLimit = 4000000;
        const gasPrice = web3.toWei(1, 'gwei');
        const gasCost = gasLimit*gasPrice;

        //prepare arguments order 1
        let tradeValues = [_15_TOKENS, _0_03ETH, orderNonce, _0_052_ETHER, _40_TOKENS,
            makerExpires, tradeNonce, _15_TOKENS, _0_03ETH, makerExpires, gasCost];
        let tradeAddresses = [token.address, etherAddress, maker, taker];
        let v = [v1, v2];
        let rs = [r1, s1, r2, s2];
        
        //execute order 1
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});
        //assert(_15_TOKENS == (await exchange.balanceOf(token.address, maker)).toNumber(), "maker has 15 tokens");
        console.log(await exchange.orderFills(tradeHashDUAL));

        //sign order 2 from taker becomes maker
        r1 = r2;
        s1 = s2;
        v1 = v2;
        //[r3, s3, v3] = getRSV(signedOrderHash2);

        //sign trade for order that equals both maker orders
        let tradeHash = utils.soliditySha3(exchange.address, token.address, _15_TOKENS, 
            etherAddress, _0_03ETH, makerExpires, tradeNonce, maker2);
        signedTradeHash = await web3.eth.sign(maker2, tradeHash);
        [r2, s2, v2] = getRSV(signedTradeHash);

        //prepare arguments order 2
         tradeValues = [_0_0195_ETHER, _15_TOKENS, tradeNonce, _15_TOKENS, _0_03ETH, 
            makerExpires, tradeNonce, _0_052_ETHER, _40_TOKENS, makerExpires, gasCost];
         tradeAddresses = [etherAddress, token.address, taker, maker2];
        v = [v1, v2];
        rs = [r1, s1, r2, s2];

        //execute
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        console.log(await exchange.orderFills(tradeHashDUAL));
        console.log(_40_TOKENS - (await exchange.orderFills(tradeHashDUAL)));
        //sign trade for order that equals both maker orders
        tradeHash = utils.soliditySha3(exchange.address, token.address, _8_766_TOKENS, 
            etherAddress, _0_037_ETHER, makerExpires, tradeNonce, maker3);
        signedTradeHash = await web3.eth.sign(maker3, tradeHash);
        [r2, s2, v2] = getRSV(signedTradeHash);

        //prepare arguments order 2
        //_0_011357_ETHER
        //console.log(_0_011337_ETHER/_8_766_TOKENS);
        amountBuyTEST = new BigNumber('11357733175914900');
        amountBuyTEST = new BigNumber('11357733175914995'); // NEW FROM YURY
        amountSellTEST = new BigNumber('8736717827626910000');
        PRICE = amountBuyTEST.dividedBy(amountSellTEST)
        console.log('****');
        console.log(PRICE);
        console.log(_0_011357_ETHER/_8_766_TOKENS);
        console.log('****');
        //console.log(_0_011357_ETHER/_8_766_TOKENS);

        let oneWei = web3.toWei(100, "wei");
        // (_0_011357_ETHER+3*oneWei)
         tradeValues = [_0_011357_ETHER, _8_766_TOKENS, tradeNonce, _8_766_TOKENS, _0_037_ETHER, 
            makerExpires, tradeNonce, _0_052_ETHER, _40_TOKENS, makerExpires, gasCost];
         tradeAddresses = [etherAddress, token.address, taker, maker3];
        v = [v1, v2];
        rs = [r1, s1, r2, s2];


        //execute
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});
        console.log(await exchange.orderFills(tradeHashDUAL));
        console.log(_40_TOKENS - (await exchange.orderFills(tradeHashDUAL)));


        // //sign order 2 from taker becomes maker
        // orderHash2 = utils.soliditySha3(exchange.address, token.address, _0_052_ETHER, 
        //     etherAddress, _40_TOKENS, makerExpires, orderNonce2, taker);
        // signedOrderHash2 = await web3.eth.sign(taker, orderHash2);
        // [r3, s3, v3] = getRSV(signedOrderHash2);

        // //sign trade for order that equals both maker orders
        // tradeHash = utils.soliditySha3(exchange.address, etherAddress, _0_052_ETHER, 
        //     token.address, _40_TOKENS, makerExpires, tradeNonce, maker2);
        // signedTradeHash = await web3.eth.sign(maker2, tradeHash);
        // [r2, s2, v2] = getRSV(signedTradeHash);


        // //prepare arguments order 2
        //  tradeValues = [_0_011357_ETHER, _8_766_TOKENS, orderNonce2, _8_766_TOKENS, _0_037_ETHER, 
        //     makerExpires, tradeNonce, _0_052_ETHER, _40_TOKENS, makerExpires, gasCost];
        //  tradeAddresses = [token.address, etherAddress, taker, maker2];
        // v = [v3, v2];
        // rs = [r3, s3, r2, s2];

        // //execute
        // await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});
    //     let takerFeeDue = oneEther * 2 / 1000;
    //     let makerFeeDue = halfEther * 1 / 1000;

    //     //taker
    //     assert(0 == (await exchange.balanceOf(token.address, taker)).toNumber(), "taker has zero tokens");
    //     assert(twoEther - takerFeeDue - gasCost - gasCost == (await exchange.balanceOf(etherAddress, taker)).toNumber(), "taker fees taken correctly");

    //     //maker one
    //     assert(oneHundredTokens == (await exchange.balanceOf(token.address, maker)).toNumber(), "maker has all the tokens");
    //     assert(halfEther - makerFeeDue == (await exchange.balanceOf(etherAddress, maker)).toNumber(), "maker fees taken correctly");

    //     //maker two
    //     assert(oneHundredTokens == (await exchange.balanceOf(token.address, maker2)).toNumber(), "maker has all the tokens");
    //     assert(halfEther - makerFeeDue == (await exchange.balanceOf(etherAddress, maker2)).toNumber(), "maker fees taken correctly");
    //     //fees
    //     assert(takerFeeDue + makerFeeDue + makerFeeDue + gasCost + gasCost == (await exchange.balanceOf(etherAddress, feeAccount)).toNumber(), "all fees credited correctly");
    });


    it("SPECIAL TEST double maker single taker trade eth<->tokens works correctly and ether and gas fees match", async () => {
        let _0_03ETH = web3.toWei(0.03, "ether");
        let _0_04ETH = web3.toWei(0.04, "ether");
        let _62_5_TOKENS = web3.toWei(62.5, "ether");
        let _15_TOKENS = web3.toWei(15, "ether");
        let _40_TOKENS = web3.toWei(40, "ether");
        let _0_1_ETHER = web3.toWei(0.1, "ether");
        let _0_052_ETHER = web3.toWei(0.052, "ether");
        let _25_TOKENS = web3.toWei(25, "ether");

        let _0_037_ETHER = web3.toWei(0.037, "ether");
        let _8_766_TOKENS = web3.toWei(8.736717827626919000, "ether");

        // adds another 100 tokens to taker
        await token.mint(taker, oneHundredTokens);

        //maker one wants to transfer their ether for erc20 tokens
        await exchange.deposit({from: maker, value: oneEther});
        //maker 2
        await exchange.deposit({from: maker2, value: oneEther});

        //taker accepts a trade of their erc20 for ether
        await token.approve(exchange.address, twoHundredTokens, {from: taker});
        await exchange.depositToken(token.address, twoHundredTokens, {from: taker});
        //taker needs ether in the account for fees
        await exchange.deposit({from: taker, value: oneEther});

        let orderNonce = 4;
        let orderNonce2 = 3;
        let tradeNonce = 32;

        /* tradeValues
        [0] amountBuy
        [1] amountSell
        [2] makerNonce
        [3] takerAmountBuy
        [4] takerAmountSell
        [5] takerExpires
        [6] takerNonce
        [7] makerAmountBuy
        [8] makerAmountSell
        [9] makerExpires
        [10] gasCost
        tradeAddressses
        [0] tokenBuy
        [1] tokenSell
        [2] maker
        [3] taker
        */
   
       // orderHash = (this), tokenBuy, makerAmountBuy, tokenSell, makerAmountSell, makerExpires, makerNonce, maker

        //sign order 1
        let orderHash = utils.soliditySha3(exchange.address, token.address, _15_TOKENS, 
            etherAddress, _0_03ETH, makerExpires, orderNonce, maker);
        let signedOrderHash = await web3.eth.sign(maker, orderHash);
        let [r1, s1, v1] = getRSV(signedOrderHash);

        //sign order 2
        let orderHash2 = utils.soliditySha3(exchange.address, token.address, _62_5_TOKENS, 
            etherAddress, _0_1_ETHER, makerExpires, orderNonce2, maker);
        let signedOrderHash2 = await web3.eth.sign(maker, orderHash2);
        let [r3, s3, v3] = getRSV(signedOrderHash2);

        //sign trade for order that equals both maker orders
        let tradeHash = utils.soliditySha3(exchange.address, etherAddress, _0_052_ETHER, 
            token.address, _40_TOKENS, makerExpires, tradeNonce, taker);
        let signedTradeHash = await web3.eth.sign(taker, tradeHash);
        let [r2, s2, v2] = getRSV(signedTradeHash);

        const gasLimit = 4000000;
        const gasPrice = web3.toWei(1, 'gwei');
        const gasCost = gasLimit*gasPrice;

        //prepare arguments order 1
        let tradeValues = [_15_TOKENS, _0_03ETH, orderNonce, _0_052_ETHER, _40_TOKENS,
            makerExpires, tradeNonce, _15_TOKENS, _0_03ETH, makerExpires, gasCost];
        let tradeAddresses = [token.address, etherAddress, maker, taker];
        let v = [v1, v2];
        let rs = [r1, s1, r2, s2];


        //execute order 1
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});
        assert(_15_TOKENS == (await exchange.balanceOf(token.address, maker)).toNumber(), "maker has 15 tokens");


        //prepare arguments order 2
         tradeValues = [_25_TOKENS, _0_04ETH, orderNonce2, _0_052_ETHER, _40_TOKENS,
            makerExpires, tradeNonce, _62_5_TOKENS, _0_1_ETHER, makerExpires, gasCost];
         tradeAddresses = [token.address, etherAddress, maker, taker];
        v = [v3, v2];
        rs = [r3, s3, r2, s2];

        //execute
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});


    //     let takerFeeDue = oneEther * 2 / 1000;
    //     let makerFeeDue = halfEther * 1 / 1000;
        
    //     //taker
    //     assert(0 == (await exchange.balanceOf(token.address, taker)).toNumber(), "taker has zero tokens");
    //     assert(twoEther - takerFeeDue - gasCost - gasCost == (await exchange.balanceOf(etherAddress, taker)).toNumber(), "taker fees taken correctly");

    //     //maker one
    //     assert(oneHundredTokens == (await exchange.balanceOf(token.address, maker)).toNumber(), "maker has all the tokens");
    //     assert(halfEther - makerFeeDue == (await exchange.balanceOf(etherAddress, maker)).toNumber(), "maker fees taken correctly");

    //     //maker two
    //     assert(oneHundredTokens == (await exchange.balanceOf(token.address, maker2)).toNumber(), "maker has all the tokens");
    //     assert(halfEther - makerFeeDue == (await exchange.balanceOf(etherAddress, maker2)).toNumber(), "maker fees taken correctly");
    //     //fees
    //     assert(takerFeeDue + makerFeeDue + makerFeeDue + gasCost + gasCost == (await exchange.balanceOf(etherAddress, feeAccount)).toNumber(), "all fees credited correctly");
    });

    it("maker fee updates work", async () => {
        await exchange.setMakerFee(twoFinney);
        assert(twoFinney == (await exchange.makerFee.call()).toNumber(), "update works");

        await exchange.setMakerFee(oneEther);
        assert(tenFinney == (await exchange.makerFee.call()).toNumber(), "maker fee not more than 1%"); 

        try {
            await exchange.setMakerFee(tenFinney);
            assert(false);
        } catch (e) {
            expectRevert(e, "same fee already set");
        }       
    });

    it("taker fee updates work", async () => {
        await exchange.setTakerFee(oneFinney);
        assert(oneFinney == (await exchange.takerFee.call()).toNumber(), "update works");

        await exchange.setTakerFee(oneEther);
        assert(twentyFinney == (await exchange.takerFee.call()).toNumber(), "taker fee not more than 2%");        

        try {
            await exchange.setTakerFee(twentyFinney);
            assert(false);
        } catch (e) {
            expectRevert(e, "same fee already set");
        }  
    });

    it("deposit and signed (admin) withdrawal of ether works correctly, taking ether as gas fee", async () => {
        await exchange.deposit({from: maker, value: oneEther});
        assert(oneEther == (await exchange.balanceOf(etherAddress, maker)), "deposit amount correctly");

        const gasLimit = 100000;
        const gasPrice = web3.toWei(1, 'gwei');
        
        let gasCost = gasLimit * gasPrice;

        const nonce = getNonce();

        let withdrawHash = utils.soliditySha3(exchange.address, etherAddress, halfEther, maker, nonce);
        let signedWithdrawHash = await web3.eth.sign(maker, withdrawHash);
        let [r, s, v] = getRSV(signedWithdrawHash);

        let gasEstimate = await exchange.adminWithdraw.estimateGas(etherAddress, halfEther, maker,
                            nonce, v, r, s, gasCost, {from: admin});

        gasCost = gasEstimate * gasPrice;

        await exchange.adminWithdraw(etherAddress, halfEther, maker, nonce, v, r, s, gasCost, {from: admin, gas: gasLimit, gasPrice: gasPrice});
        
        assert(halfEther - gasCost == (await exchange.balanceOf(etherAddress, maker)), "withdrawal with gas fee works correctly");
        assert(gasCost == (await exchange.balanceOf(etherAddress, feeAccount)), "withdrawal fee is correct");
    });

    it("deposit and signed (admin) withdrawal of tokens works correctly, taking ether as gas fee", async () => {

        await token.approveAndDeposit(exchange.address, oneHundredTokens, {from: maker});
        assert(oneHundredTokens == (await exchange.balanceOf(token.address, maker)).toNumber(), "token deposit works correctly");

        //also deposit ether to pay for fees
        await exchange.deposit({from: maker, value: oneEther});
        assert(oneEther == (await exchange.balanceOf(etherAddress, maker)), "deposit amount correctly");

        const gasLimit = 2000000;
        const gasPrice = web3.toWei(1, 'gwei');
        const gasCost = gasLimit*gasPrice;

        const nonce = getNonce();
        let withdrawHash = utils.soliditySha3(exchange.address, token.address, oneHundredTokens, maker, nonce);
        let signedWithdrawHash = await web3.eth.sign(maker, withdrawHash);
        let [r, s, v] = getRSV(signedWithdrawHash);

        await exchange.adminWithdraw(token.address, oneHundredTokens, maker, nonce, v, r, s, gasCost, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        assert(0 == (await exchange.balanceOf(token.address, maker)), "token withdrawal works correctly");
        assert(oneEther - gasCost == (await exchange.balanceOf(etherAddress, maker)), "gas payment is correct");
        assert(gasCost == (await exchange.balanceOf(etherAddress, feeAccount)), "withdrawal fee is correct");
    });

    it("deposit and signed (admin) withdrawal of tokens works correctly, max 30 finney gasCost", async () => {
        await token.approve(exchange.address, oneHundredTokens, {from: maker});
        await exchange.depositToken(token.address, oneHundredTokens, {from: maker});
        assert(oneHundredTokens == (await exchange.balanceOf(token.address, maker)).toNumber(), "token deposit works correctly");

        //also deposit ether to pay for fees
        await exchange.deposit({from: maker, value: oneEther});
        assert(oneEther == (await exchange.balanceOf(etherAddress, maker)), "deposit amount correctly");

        const gasLimit = 2000000;
        const gasPrice = web3.toWei(1, 'gwei');
        const gasCost = oneEther;

        const nonce = getNonce();
        let withdrawHash = utils.soliditySha3(exchange.address, token.address, oneHundredTokens, maker, nonce);
        let signedWithdrawHash = await web3.eth.sign(maker, withdrawHash);
        let [r, s, v] = getRSV(signedWithdrawHash);

        await exchange.adminWithdraw(token.address, oneHundredTokens, maker, nonce, v, r, s, gasCost, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        assert(0 == (await exchange.balanceOf(token.address, maker)), "token withdrawal works correctly");
        assert(oneEther - thirtyFinney == (await exchange.balanceOf(etherAddress, maker)), "gas payment is correct");
        assert(thirtyFinney == (await exchange.balanceOf(etherAddress, feeAccount)), "withdrawal fee is correct");
    });

    it("deposit and emergency withdrawal of ether works correctly", async () => {
        exchangeALT = await DexBrokerage.new(makerFee, takerFee, feeAccount, 3);

        await exchangeALT.deposit({from: maker, value: oneEther});
        assert(oneEther == (await exchangeALT.balanceOf(etherAddress, maker)), "deposit amount correctly");
        
        for (let i = 0; i < 2; i++) {
            web3.currentProvider.send({jsonrpc: "2.0", method: "evm_mine", params: [], id: 0});
        }

        await exchangeALT.withdraw(etherAddress, oneEther, {from: maker});
        assert(0 == (await exchangeALT.balanceOf(etherAddress, maker)), "withdrawal works correctly");        
    });

    it("deposit and emergency withdrawal of tokens works correctly", async () => {
        exchangeALT = await DexBrokerage.new(makerFee, takerFee, feeAccount, 3);

        await token.approve(exchangeALT.address, oneHundredTokens, {from: maker});
        await exchangeALT.depositToken(token.address, oneHundredTokens, {from: maker});
        assert(oneHundredTokens == (await exchangeALT.balanceOf(token.address, maker)).toNumber(), "token deposit works correctly");
        
        for (let i = 0; i < 2; i++) {
            web3.currentProvider.send({jsonrpc: "2.0", method: "evm_mine", params: [], id: 0});
        }

        await exchangeALT.withdraw(token.address, oneHundredTokens, {from: maker});
        assert(0 == (await exchangeALT.balanceOf(token.address, maker)), "token withdrawal works correctly");        
    });

    it("taker becomes maker tokens<->eth works correctly and ether and gas fees match", async () => {

        //maker one wants to sell 100 tokens for ether
        await token.approve(exchange.address, oneHundredTokens, {from: maker});
        await exchange.depositToken(token.address, oneHundredTokens, {from: maker});

        //mint tokens for taker2 to sell 100 tokens for ether
        let taker2 = maker2;
        await token.mint(taker2, oneHundredTokens);
        await token.approve(exchange.address, oneHundredTokens, {from: taker2});
        await exchange.depositToken(token.address, oneHundredTokens, {from: taker2});

        //maker one and two needs ether in the account for fees
        await exchange.deposit({from: maker, value: oneEther});
        await exchange.deposit({from: taker2, value: oneEther});

        //taker wants to give ether for tokens
        await exchange.deposit({from: taker, value: oneAndHalfEther});

        let orderNonce  = getNonce();
        let orderNonce2 = getNonce();
        let tradeNonce  = getNonce();

        //maker one sign order 
        let orderHash = utils.soliditySha3(exchange.address, etherAddress, halfEther, 
            token.address, oneHundredTokens, makerExpires, orderNonce, maker);
        let signedOrderHash = await web3.eth.sign(maker, orderHash);
        let [r1, s1, v1] = getRSV(signedOrderHash);

        //sign trade that becomes a maker hash later
        let tradeHash = utils.soliditySha3(exchange.address, token.address, twoHundredTokens, 
            etherAddress, oneEther, makerExpires, tradeNonce, taker);
        let signedTradeHash = await web3.eth.sign(taker, tradeHash);
        let [r2, s2, v2] = getRSV(signedTradeHash);

        const gasLimit = 4000000;
        const gasPrice = web3.toWei(1, 'gwei');
        const gasCost = gasLimit*gasPrice;

        //maker one trade prepare arguments
        let tradeValues = [halfEther, oneHundredTokens, orderNonce, twoHundredTokens, oneEther,
            makerExpires, tradeNonce, halfEther, oneHundredTokens, makerExpires, gasCost];
            let tradeAddresses = [etherAddress, token.address, maker, taker];
        let v = [v1, v2];
        let rs = [r1, s1, r2, s2];

        //execute maker one trade 
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        //checks tradehash is adding only tokens
        assert(oneHundredTokens == await exchange.orderFills(tradeHash))

        //taker two sign order
        let orderHash2 = utils.soliditySha3(exchange.address, etherAddress, halfEther, 
            token.address, oneHundredTokens, makerExpires, orderNonce2, taker2);
        let signedOrderHash2 = await web3.eth.sign(taker2, orderHash2);
        let [r3, s3, v3] = getRSV(signedOrderHash2);

        //maker two trade prepare arguments
         tradeValues = [oneHundredTokens, halfEther, tradeNonce, halfEther, oneHundredTokens,
            makerExpires, orderNonce2, twoHundredTokens, oneEther, makerExpires, gasCost];
             tradeAddresses = [token.address, etherAddress, taker, taker2];

        v = [v2, v3];
        rs = [r2, s2, r3, s3];

        //execute maker two trade 
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        //checks tradehash that becomes maker is adding only tokens
        assert(twoHundredTokens == await exchange.orderFills(tradeHash));

        let takerFeeDue = halfEther * 2 / 1000;
        let makerFeeDue = halfEther * 1 / 1000;
        
        //maker one
        assert(0 == (await exchange.balanceOf(token.address, maker)).toNumber(), "maker one has zero tokens");
        assert(oneAndHalfEther - makerFeeDue == (await exchange.balanceOf(etherAddress, maker)).toNumber(), "maker one fees taken correctly");

        //taker two
        assert(0 == (await exchange.balanceOf(token.address, taker2)).toNumber(), "taker two has zero tokens");
        assert(oneAndHalfEther - takerFeeDue - gasCost == (await exchange.balanceOf(etherAddress, taker2)).toNumber(), "taker two fees taken correctly");

        //taker
        assert(twoHundredTokens == (await exchange.balanceOf(token.address, taker)).toNumber(), "taker has all the tokens");
        assert(halfEther - takerFeeDue - makerFeeDue - gasCost  == (await exchange.balanceOf(etherAddress, taker)).toNumber(), "taker + maker fees taken correctly");

        //fees
        assert(takerFeeDue + takerFeeDue + makerFeeDue + makerFeeDue + gasCost + gasCost == (await exchange.balanceOf(etherAddress, feeAccount)).toNumber(), "all fees credited correctly");
    });

    it("double maker single taker trade tokens<->eth works correctly and ether and gas fees match", async () => {

        //maker one wants to sell 100 tokens for ether
        await token.approve(exchange.address, oneHundredTokens, {from: maker});
        await exchange.depositToken(token.address, oneHundredTokens, {from: maker});

        //mint tokens for maker 2 to sell 100 tokens for ether
        await token.mint(maker2, oneHundredTokens);
        await token.approve(exchange.address, oneHundredTokens, {from: maker2});
        await exchange.depositToken(token.address, oneHundredTokens, {from: maker2});

        //maker one and two needs ether in the account for fees
        await exchange.deposit({from: maker, value: oneEther});
        await exchange.deposit({from: maker2, value: oneEther});

        //taker wants to give ether for tokens
        await exchange.deposit({from: taker, value: oneAndHalfEther});

        let orderNonce = getNonce();
        let orderNonce2 = getNonce();
        let tradeNonce = getNonce();

        //maker one sign order 
        let orderHash = utils.soliditySha3(exchange.address, etherAddress, halfEther, 
            token.address, oneHundredTokens, makerExpires, orderNonce, maker);
        let signedOrderHash = await web3.eth.sign(maker, orderHash);
        let [r1, s1, v1] = getRSV(signedOrderHash);

        //maker two sign order
        let orderHash2 = utils.soliditySha3(exchange.address, etherAddress, halfEther, 
            token.address, oneHundredTokens, makerExpires, orderNonce2, maker2);
        let signedOrderHash2 = await web3.eth.sign(maker2, orderHash2);
        let [r3, s3, v3] = getRSV(signedOrderHash2);

        // orderHash = keccak256(this, tradeAddresses[tokenBuy], tradevalues[makerAmountBuy], 
        // tradeAddresses[tokenSell], tradevalues[makerAmountSell], tradevalues[makerExpires], tradevalues[makerNonce], tradeAddresses[maker]);

        //sign trade
        let tradeHash = utils.soliditySha3(exchange.address, token.address, twoHundredTokens, 
            etherAddress, oneEther, makerExpires, tradeNonce, taker);
        let signedTradeHash = await web3.eth.sign(taker, tradeHash);
        let [r2, s2, v2] = getRSV(signedTradeHash);
        
        // tradeHash = keccak256(this, tradeAddresses[tokenSell], tradevalues[takerAmountBuy], 
        // tradeAddresses[tokenBuy], tradevalues[takerAmountSell], tradevalues[takerExpires], tradevalues[takerNonce], tradeAddresses[taker]);

        const gasLimit = 4000000;
        const gasPrice = web3.toWei(1, 'gwei');
        const gasCost = gasLimit*gasPrice;

        //maker one trade prepare arguments
        let tradeValues = [halfEther, oneHundredTokens, orderNonce, twoHundredTokens, oneEther,
            makerExpires, tradeNonce, halfEther, oneHundredTokens, makerExpires, gasCost];
            let tradeAddresses = [etherAddress, token.address, maker, taker];
        let v = [v1, v2];
        let rs = [r1, s1, r2, s2];

        //execute maker one trade 
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        //maker two trade prepare arguments
         tradeValues = [halfEther, oneHundredTokens, orderNonce2, twoHundredTokens, oneEther,
            makerExpires, tradeNonce, halfEther, oneHundredTokens, makerExpires, gasCost];
             tradeAddresses = [etherAddress, token.address, maker2, taker];
        v = [v3, v2];
        rs = [r3, s3, r2, s2];

        //execute maker two trade 
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        let takerFeeDue = oneEther * 2 / 1000;
        let makerFeeDue = halfEther * 1 / 1000;
        
        //maker one
        assert(0 == (await exchange.balanceOf(token.address, maker)).toNumber(), "maker one has zero tokens");
        assert(oneAndHalfEther - makerFeeDue == (await exchange.balanceOf(etherAddress, maker)).toNumber(), "maker one fees taken correctly");

        //maker two
        assert(0 == (await exchange.balanceOf(token.address, maker2)).toNumber(), "maker two has zero tokens");
        assert(oneAndHalfEther - makerFeeDue == (await exchange.balanceOf(etherAddress, maker2)).toNumber(), "maker two fees taken correctly");

        //taker
        assert(twoHundredTokens == (await exchange.balanceOf(token.address, taker)).toNumber(), "taker has all the tokens");
        assert(halfEther - takerFeeDue - gasCost - gasCost == (await exchange.balanceOf(etherAddress, taker)).toNumber(), "taker fees taken correctly");

        //fees
        assert(takerFeeDue + makerFeeDue + makerFeeDue + gasCost + gasCost == (await exchange.balanceOf(etherAddress, feeAccount)).toNumber(), "all fees credited correctly");
    });

    it("double maker single taker OFFSET PRICE, matches taker rate, trade eth<->tokens works correctly and ether and gas fees match", async () => {
        // adds another 100 tokens to taker
        await token.mint(taker, oneHundredTokens);

        //maker one wants to transfer their ether for erc20 tokens
        await exchange.deposit({from: maker, value: oneEther});
        //maker 2
        await exchange.deposit({from: maker2, value: oneEther});

        //taker accepts a trade of their erc20 for ether
        await token.approve(exchange.address, twoHundredTokens, {from: taker});
        await exchange.depositToken(token.address, twoHundredTokens, {from: taker});
        //taker needs ether in the account for fees
        await exchange.deposit({from: taker, value: oneEther});

        let orderNonce = getNonce();
        let orderNonce2 = getNonce();
        let tradeNonce = getNonce();
   
        //sign order 1
        let orderHash = utils.soliditySha3(exchange.address, token.address, oneHundredTokens, 
            etherAddress, halfEther, makerExpires, orderNonce, maker);
        let signedOrderHash = await web3.eth.sign(maker, orderHash);
        let [r1, s1, v1] = getRSV(signedOrderHash);

        //sign order 2
        let orderHash2 = utils.soliditySha3(exchange.address, token.address, oneHundredTokens, 
            etherAddress, halfEther, makerExpires, orderNonce2, maker2);
        let signedOrderHash2 = await web3.eth.sign(maker2, orderHash2);
        let [r3, s3, v3] = getRSV(signedOrderHash2);

        //sign trade for order that equals both maker orders
        //trader is offering a lower price than maker requests
        let tradeHash = utils.soliditySha3(exchange.address, etherAddress, halfEther, 
            token.address, twoHundredTokens, makerExpires, tradeNonce, taker);
        let signedTradeHash = await web3.eth.sign(taker, tradeHash);
        let [r2, s2, v2] = getRSV(signedTradeHash);

        const gasLimit = 4000000;
        const gasPrice = web3.toWei(1, 'gwei');
        const gasCost = gasLimit*gasPrice;

        //prepare arguments order 1
        let tradeValues = [oneHundredTokens, oneQuarterEther, orderNonce, halfEther, twoHundredTokens,
            makerExpires, tradeNonce, oneHundredTokens, halfEther, makerExpires, gasCost];
        let tradeAddresses = [token.address, etherAddress, maker, taker];
        let v = [v1, v2];
        let rs = [r1, s1, r2, s2];

        // //execute order 1
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        //prepare arguments order 2
         tradeValues = [oneHundredTokens, oneQuarterEther, orderNonce2, halfEther, twoHundredTokens,
            makerExpires, tradeNonce, oneHundredTokens, halfEther, makerExpires, gasCost];
         tradeAddresses = [token.address, etherAddress, maker2, taker];
        v = [v3, v2];
        rs = [r3, s3, r2, s2];

        //execute
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        let takerFeeDue = halfEther * 2 / 1000;
        let makerFeeDue = oneQuarterEther * 1 / 1000;
        
        //taker is given rate set by taker
        assert(0 == (await exchange.balanceOf(token.address, taker)).toNumber(), "taker has zero tokens");
        assert(oneAndHalfEther - takerFeeDue - gasCost - gasCost == (await exchange.balanceOf(etherAddress, taker)).toNumber(), "taker fees taken correctly");

        //maker one
        assert(oneHundredTokens == (await exchange.balanceOf(token.address, maker)).toNumber(), "maker has all the tokens");
        assert(oneEther - oneQuarterEther - makerFeeDue == (await exchange.balanceOf(etherAddress, maker)).toNumber(), "maker fees taken correctly");

        //maker two
        assert(oneHundredTokens == (await exchange.balanceOf(token.address, maker2)).toNumber(), "maker has all the tokens");
        assert(oneEther - oneQuarterEther - makerFeeDue == (await exchange.balanceOf(etherAddress, maker2)).toNumber(), "maker fees taken correctly");
        //fees
        assert(takerFeeDue + makerFeeDue + makerFeeDue + gasCost + gasCost == (await exchange.balanceOf(etherAddress, feeAccount)).toNumber(), "all fees credited correctly");
    });

    it("double maker single taker OFFSET PRICE, matches maker rate, trade eth<->tokens works correctly and ether and gas fees match", async () => {
        // adds another 100 tokens to taker
        await token.mint(taker, oneHundredTokens);

        //maker one wants to transfer their ether for erc20 tokens
        await exchange.deposit({from: maker, value: oneEther});
        //maker 2
        await exchange.deposit({from: maker2, value: oneEther});

        //taker accepts a trade of their erc20 for ether
        await token.approve(exchange.address, twoHundredTokens, {from: taker});
        await exchange.depositToken(token.address, twoHundredTokens, {from: taker});
        //taker needs ether in the account for fees
        await exchange.deposit({from: taker, value: oneEther});

        let orderNonce = getNonce();
        let orderNonce2 = getNonce();
        let tradeNonce = getNonce();
   
        //sign order 1
        let orderHash = utils.soliditySha3(exchange.address, token.address, oneHundredTokens, 
            etherAddress, halfEther, makerExpires, orderNonce, maker);
        let signedOrderHash = await web3.eth.sign(maker, orderHash);
        let [r1, s1, v1] = getRSV(signedOrderHash);

        //sign order 2
        let orderHash2 = utils.soliditySha3(exchange.address, token.address, oneHundredTokens, 
            etherAddress, halfEther, makerExpires, orderNonce2, maker2);
        let signedOrderHash2 = await web3.eth.sign(maker2, orderHash2);
        let [r3, s3, v3] = getRSV(signedOrderHash2);

        //sign trade for order that equals both maker orders
        //trader is offering a lower price than maker requests
        let tradeHash = utils.soliditySha3(exchange.address, etherAddress, halfEther, 
            token.address, twoHundredTokens, makerExpires, tradeNonce, taker);
        let signedTradeHash = await web3.eth.sign(taker, tradeHash);
        let [r2, s2, v2] = getRSV(signedTradeHash);

        const gasLimit = 4000000;
        const gasPrice = web3.toWei(1, 'gwei');
        const gasCost = gasLimit*gasPrice;

        //prepare arguments order 1
        let tradeValues = [oneHundredTokens, halfEther, orderNonce, halfEther, twoHundredTokens,
            makerExpires, tradeNonce, oneHundredTokens, halfEther, makerExpires, gasCost];
        let tradeAddresses = [token.address, etherAddress, maker, taker];
        let v = [v1, v2];
        let rs = [r1, s1, r2, s2];
        
        //require(orderFills[tradeHash].add(tradeValues[1]) <= tradeValues[3]);
        //require(orderFills[tradeHash].add(amountSell) <= takerAmountBuy);
        // 0.5 ether <= 0.5 ether
        // taker price = 0.5 eth/ 200 tokens = 400 tokens/eth
        // maker price = 100 tokens/ 0.5 eth = 200 tokens/eth
        /* tradeValues
           [0] amountBuy
           [1] amountSell
           [2] makerNonce
           [3] takerAmountBuy
           [4] takerAmountSell
           [5] takerExpires
           [6] takerNonce
           [7] makerAmountBuy
           [8] makerAmountSell
           [9] makerExpires
           [10] gasCost
         tradeAddressses
           [0] tokenBuy
           [1] tokenSell
           [2] maker
           [3] taker
         */
        //execute order 1
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        //prepare arguments order 2
         tradeValues = [oneHundredTokens, halfEther, orderNonce2, halfEther, twoHundredTokens,
            makerExpires, tradeNonce, oneHundredTokens, halfEther, makerExpires, gasCost];
         tradeAddresses = [token.address, etherAddress, maker2, taker];
        v = [v3, v2];
        rs = [r3, s3, r2, s2];

        //execute 
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        let takerFeeDue = oneEther * 2 / 1000;
        let makerFeeDue = halfEther * 1 / 1000;
        // WIP
        //taker is given rate set by orderHashes
        assert(0 == (await exchange.balanceOf(token.address, taker)).toNumber(), "taker has zero tokens");
        assert(twoEther - takerFeeDue - gasCost - gasCost == (await exchange.balanceOf(etherAddress, taker)).toNumber(), "taker fees taken correctly");

        //maker one
        assert(oneHundredTokens == (await exchange.balanceOf(token.address, maker)).toNumber(), "maker has all the tokens");
        assert(halfEther - makerFeeDue == (await exchange.balanceOf(etherAddress, maker)).toNumber(), "maker fees taken correctly");

        //maker two
        assert(oneHundredTokens == (await exchange.balanceOf(token.address, maker2)).toNumber(), "maker has all the tokens");
        assert(halfEther - makerFeeDue == (await exchange.balanceOf(etherAddress, maker2)).toNumber(), "maker fees taken correctly");
        //fees
        assert(takerFeeDue + makerFeeDue + makerFeeDue + gasCost + gasCost == (await exchange.balanceOf(etherAddress, feeAccount)).toNumber(), "all fees credited correctly");
    });

    it("double maker single taker OFFSET PRICE, matches maker rate, trade tokens<->eth works correctly, tests order and trade fill and price boundary", async () => {

        //maker one wants to sell 100 tokens for ether
        await token.approve(exchange.address, oneHundredTokens, {from: maker});
        await exchange.depositToken(token.address, oneHundredTokens, {from: maker});

        //mint tokens for maker 2 to sell 100 tokens for ether
        await token.mint(maker2, oneHundredTokens);
        await token.approve(exchange.address, oneHundredTokens, {from: maker2});
        await exchange.depositToken(token.address, oneHundredTokens, {from: maker2});

        //mint tokens for maker 3 to sell 200 tokens for ether
        await token.mint(maker3, twoHundredTokens);
        await token.approve(exchange.address, twoHundredTokens, {from: maker3});
        await exchange.depositToken(token.address, twoHundredTokens, {from: maker3});

        //maker one and two needs ether in the account for fees
        await exchange.deposit({from: maker, value: oneEther});
        await exchange.deposit({from: maker2, value: oneEther});
        await exchange.deposit({from: maker3, value: oneEther});


        //taker wants to give ether for tokens
        await exchange.deposit({from: taker, value: twoEther});

        let orderNonce  = getNonce();
        let orderNonce2 = getNonce();
        let orderNonce3 = getNonce();
        let tradeNonce  = getNonce();

        //maker one sign order 
        let orderHash = utils.soliditySha3(exchange.address, etherAddress, halfEther, 
            token.address, oneHundredTokens, makerExpires, orderNonce, maker);
        let signedOrderHash = await web3.eth.sign(maker, orderHash);
        let [r1, s1, v1] = getRSV(signedOrderHash);

        //maker two sign order
        let orderHash2 = utils.soliditySha3(exchange.address, etherAddress, halfEther, 
            token.address, oneHundredTokens, makerExpires, orderNonce2, maker2);
        let signedOrderHash2 = await web3.eth.sign(maker2, orderHash2);
        let [r3, s3, v3] = getRSV(signedOrderHash2);

        //maker three sign order
        let orderHash3 = utils.soliditySha3(exchange.address, etherAddress, oneEther, 
            token.address, twoHundredTokens, makerExpires, orderNonce3, maker3);
        let signedOrderHash3 = await web3.eth.sign(maker3, orderHash3);
        let [r4, s4, v4] = getRSV(signedOrderHash3);

        //sign trade
        let tradeHash = utils.soliditySha3(exchange.address, token.address, twoHundredTokens, 
            etherAddress, oneAndHalfEther, makerExpires, tradeNonce, taker);
        let signedTradeHash = await web3.eth.sign(taker, tradeHash);
        let [r2, s2, v2] = getRSV(signedTradeHash);
        
        const gasLimit = 4000000;
        const gasPrice = web3.toWei(1, 'gwei');
        const gasCost = gasLimit*gasPrice;

        //maker one trade prepare arguments
        let tradeValues = [halfEther, oneHundredTokens, orderNonce, twoHundredTokens, oneAndHalfEther,
            makerExpires, tradeNonce, halfEther, oneHundredTokens, makerExpires, gasCost];
        let tradeAddresses = [etherAddress, token.address, maker, taker];
        let v = [v1, v2];
        let rs = [r1, s1, r2, s2];

        /* tradeValues
           [0] amountBuy
           [1] amountSell
           [2] makerNonce
           [3] takerAmountBuy
           [4] takerAmountSell
           [5] takerExpires
           [6] takerNonce
           [7] makerAmountBuy
           [8] makerAmountSell
           [9] makerExpires
           [10] gasCost
         tradeAddressses
           [0] tokenBuy
           [1] tokenSell
           [2] maker
           [3] taker
         */

        //execute maker one trade 
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        //maker two trade prepare arguments
        v  = [v3, v2];
        rs = [r3, s3, r2, s2];
        tradeAddresses = [etherAddress, token.address, maker2, taker];

        //try to rip off maker
        //price >= makerAmountBuy/makerAmount Sell (0.5 eth/100 = 0.005 eth/token) 
        //price = amountBuy/amountSell = 0.004999.. eth/token
        tradeValues = [halfEther-100*oneHundredWei, oneHundredTokens, orderNonce2, twoHundredTokens, oneAndHalfEther,
                                makerExpires, tradeNonce, halfEther, oneHundredTokens, makerExpires, gasCost];

        await Utils.expectRevert(async () => {
            await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});
        });

        //try to rip off taker
        //price <= takerAmountSell / takerAmountBuy (1.5 eth/ 200 tokens = 0.0075 eth/token)
        //price = amountBuy/amountSell = 1/100 = 0.01 eth/token
        tradeValues = [oneEther, oneHundredTokens, orderNonce2, twoHundredTokens, oneAndHalfEther,
                                makerExpires, tradeNonce, halfEther, oneHundredTokens, makerExpires, gasCost];
        await Utils.expectRevert(async () => {
            await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});
        });


        tradeValues = [halfEther, oneHundredTokens, orderNonce2, twoHundredTokens, oneAndHalfEther,
                       makerExpires, tradeNonce, halfEther, oneHundredTokens, makerExpires, gasCost];

        //execute maker two trade 
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        //try to buy more than allowed
        // require(orderFills[orderHash].add(amountBuy) <= makerAmountBuy);
        //oneEther <= one Ether
        // require(orderFills[tradeHash].add(amountBuy) <= takerAmountSell); old
        //oneEther + one Ether <= oneAndHalfEther old
        // require(orderFills[tradeHash].add(amountSell) <= takerAmountBuy);
        // 200 + 100 <= 200 tokens

        v  = [v4, v2];
        rs = [r4, s4, r2, s2];
        tradeAddresses = [etherAddress, token.address, maker3, taker];

        tradeValues = [oneEther, twoHundredTokens, orderNonce3, twoHundredTokens, oneAndHalfEther,
                                makerExpires, tradeNonce, oneEther, twoHundredTokens, makerExpires, gasCost];
        await Utils.expectRevert(async () => {
            await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});
        });

        let takerFeeDue = oneEther * 2 / 1000;
        let makerFeeDue = halfEther * 1 / 1000;
        
        //maker one
        assert(0 == (await exchange.balanceOf(token.address, maker)).toNumber(), "maker one has zero tokens");
        assert(oneAndHalfEther - makerFeeDue == (await exchange.balanceOf(etherAddress, maker)).toNumber(), "maker one fees taken correctly");

        //maker two
        assert(0 == (await exchange.balanceOf(token.address, maker2)).toNumber(), "maker two has zero tokens");
        assert(oneAndHalfEther - makerFeeDue == (await exchange.balanceOf(etherAddress, maker2)).toNumber(), "maker two fees taken correctly");

        //taker
        assert(twoHundredTokens == (await exchange.balanceOf(token.address, taker)).toNumber(), "taker has all the tokens");
        assert(oneEther - takerFeeDue - gasCost - gasCost == (await exchange.balanceOf(etherAddress, taker)).toNumber(), "taker fees taken correctly");

        //fees
        assert(takerFeeDue + makerFeeDue + makerFeeDue + gasCost + gasCost == (await exchange.balanceOf(etherAddress, feeAccount)).toNumber(), "all fees credited correctly");
    });

    it("double maker single taker trade eth<->tokens works correctly and ether and gas fees match", async () => {
        // adds another 100 tokens to taker
        await token.mint(taker, oneHundredTokens);

        //maker one wants to transfer their ether for erc20 tokens
        await exchange.deposit({from: maker, value: oneEther});
        //maker 2
        await exchange.deposit({from: maker2, value: oneEther});

        //taker accepts a trade of their erc20 for ether
        await token.approve(exchange.address, twoHundredTokens, {from: taker});
        await exchange.depositToken(token.address, twoHundredTokens, {from: taker});
        //taker needs ether in the account for fees
        await exchange.deposit({from: taker, value: oneEther});

        let orderNonce = getNonce();
        let orderNonce2 = getNonce();
        let tradeNonce = getNonce();

   
        //sign order 1
        let orderHash = utils.soliditySha3(exchange.address, token.address, oneHundredTokens, 
            etherAddress, halfEther, makerExpires, orderNonce, maker);
        let signedOrderHash = await web3.eth.sign(maker, orderHash);
        let [r1, s1, v1] = getRSV(signedOrderHash);

        //sign order 2
        let orderHash2 = utils.soliditySha3(exchange.address, token.address, oneHundredTokens, 
            etherAddress, halfEther, makerExpires, orderNonce2, maker2);
        let signedOrderHash2 = await web3.eth.sign(maker2, orderHash2);
        let [r3, s3, v3] = getRSV(signedOrderHash2);

        //sign trade for order that equals both maker orders
        let tradeHash = utils.soliditySha3(exchange.address, etherAddress, oneEther, 
            token.address, twoHundredTokens, makerExpires, tradeNonce, taker);
        let signedTradeHash = await web3.eth.sign(taker, tradeHash);
        let [r2, s2, v2] = getRSV(signedTradeHash);

        const gasLimit = 4000000;
        const gasPrice = web3.toWei(1, 'gwei');
        const gasCost = gasLimit*gasPrice;

        //prepare arguments order 1
        let tradeValues = [oneHundredTokens, halfEther, orderNonce, oneEther, twoHundredTokens,
            makerExpires, tradeNonce, oneHundredTokens, halfEther, makerExpires, gasCost];
        let tradeAddresses = [token.address, etherAddress, maker, taker];
        let v = [v1, v2];
        let rs = [r1, s1, r2, s2];


        //execute order 1
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        //prepare arguments order 2
         tradeValues = [oneHundredTokens, halfEther, orderNonce2, oneEther, twoHundredTokens,
            makerExpires, tradeNonce, oneHundredTokens, halfEther, makerExpires, gasCost];
         tradeAddresses = [token.address, etherAddress, maker2, taker];
        v = [v3, v2];
        rs = [r3, s3, r2, s2];

        //execute
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        let takerFeeDue = oneEther * 2 / 1000;
        let makerFeeDue = halfEther * 1 / 1000;
        
        //taker
        assert(0 == (await exchange.balanceOf(token.address, taker)).toNumber(), "taker has zero tokens");
        assert(twoEther - takerFeeDue - gasCost - gasCost == (await exchange.balanceOf(etherAddress, taker)).toNumber(), "taker fees taken correctly");

        //maker one
        assert(oneHundredTokens == (await exchange.balanceOf(token.address, maker)).toNumber(), "maker has all the tokens");
        assert(halfEther - makerFeeDue == (await exchange.balanceOf(etherAddress, maker)).toNumber(), "maker fees taken correctly");

        //maker two
        assert(oneHundredTokens == (await exchange.balanceOf(token.address, maker2)).toNumber(), "maker has all the tokens");
        assert(halfEther - makerFeeDue == (await exchange.balanceOf(etherAddress, maker2)).toNumber(), "maker fees taken correctly");
        //fees
        assert(takerFeeDue + makerFeeDue + makerFeeDue + gasCost + gasCost == (await exchange.balanceOf(etherAddress, feeAccount)).toNumber(), "all fees credited correctly");
    });

    it("simple trade eth<->tokens works correctly and ether and gas fees match", async () => {

        //maker one wants to transfer their ether for erc20 tokens
        await exchange.deposit({from: maker, value: oneEther});

        //taker accepts a trade of their erc20 for ether
        await token.approve(exchange.address, oneHundredTokens, {from: taker});
        await exchange.depositToken(token.address, oneHundredTokens, {from: taker});
        //taker needs ether in the account for fees
        await exchange.deposit({from: taker, value: oneEther});

        let orderNonce = getNonce();
        let tradeNonce = getNonce();

        //sign order
        let orderHash = utils.soliditySha3(exchange.address, token.address, oneHundredTokens, 
            etherAddress, halfEther, makerExpires, orderNonce, maker);
        let signedOrderHash = await web3.eth.sign(maker, orderHash);
        let [r1, s1, v1] = getRSV(signedOrderHash);

        //sign trade
        let tradeHash = utils.soliditySha3(exchange.address, etherAddress, halfEther, 
            token.address, oneHundredTokens, makerExpires, tradeNonce, taker);
        let signedTradeHash = await web3.eth.sign(taker, tradeHash);
        let [r2, s2, v2] = getRSV(signedTradeHash);

        const gasLimit = 4000000;
        const gasPrice = web3.toWei(1, 'gwei');
        const gasCost = gasLimit*gasPrice;

        //prepare arguments
        let tradeValues = [oneHundredTokens, halfEther, orderNonce, halfEther, oneHundredTokens,
            makerExpires, tradeNonce, oneHundredTokens, halfEther, makerExpires, gasCost];
        let tradeAddresses = [token.address, etherAddress, maker, taker];
        let v = [v1, v2];
        let rs = [r1, s1, r2, s2];

        //execute
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        let takerFeeDue = halfEther * 2 / 1000;
        let makerFeeDue = halfEther * 1 / 1000;
        
        //taker
        assert(0 == (await exchange.balanceOf(token.address, taker)).toNumber(), "taker has zero tokens");
        assert(oneAndHalfEther - takerFeeDue - gasCost == (await exchange.balanceOf(etherAddress, taker)).toNumber(), "taker fees taken correctly");

        //maker
        assert(oneHundredTokens == (await exchange.balanceOf(token.address, maker)).toNumber(), "maker has all the tokens");
        assert(halfEther - makerFeeDue == (await exchange.balanceOf(etherAddress, maker)).toNumber(), "maker fees taken correctly");

        // //fees
        assert(takerFeeDue + makerFeeDue + gasCost == (await exchange.balanceOf(etherAddress, feeAccount)).toNumber(), "all fees credited correctly");
    });

    it("simple trade tokens<->eth works correctly and ether and gas fees match", async () => {

        //maker wants to sell tokens for ether
        await token.approve(exchange.address, oneHundredTokens, {from: maker});
        await exchange.depositToken(token.address, oneHundredTokens, {from: maker});

        // change exchange 
        //maker needs ether in the account for fees
        await exchange.deposit({from: maker, value: oneEther});

        //taker wants to give ether for tokens
        await exchange.deposit({from: taker, value: oneEther});

        let orderNonce = getNonce();
        let tradeNonce = getNonce();

        //sign order
        let orderHash = utils.soliditySha3(exchange.address, etherAddress, halfEther, 
            token.address, oneHundredTokens, makerExpires, orderNonce, maker);
        let signedOrderHash = await web3.eth.sign(maker, orderHash);
        let [r1, s1, v1] = getRSV(signedOrderHash);

        //sign trade
        let tradeHash = utils.soliditySha3(exchange.address, token.address, oneHundredTokens, 
            etherAddress, halfEther, makerExpires, tradeNonce, taker);
        let signedTradeHash = await web3.eth.sign(taker, tradeHash);
        let [r2, s2, v2] = getRSV(signedTradeHash);

        const gasLimit = 4000000;
        const gasPrice = web3.toWei(1, 'gwei');
        const gasCost = gasLimit*gasPrice;

        //prepare arguments
        let tradeValues = [halfEther, oneHundredTokens, orderNonce, oneHundredTokens, halfEther,
            makerExpires, tradeNonce, halfEther, oneHundredTokens, makerExpires, gasCost];
        let tradeAddresses = [etherAddress, token.address, maker, taker];
        let v = [v1, v2];
        let rs = [r1, s1, r2, s2];

        //execute
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        let takerFeeDue = halfEther * 2 / 1000;
        let makerFeeDue = halfEther * 1 / 1000;
        
        //maker
        assert(0 == (await exchange.balanceOf(token.address, maker)).toNumber(), "maker has zero tokens");
        assert(oneAndHalfEther - makerFeeDue == (await exchange.balanceOf(etherAddress, maker)).toNumber(), "maker fees taken correctly");

        //taker
        assert(oneHundredTokens == (await exchange.balanceOf(token.address, taker)).toNumber(), "taker has all the tokens");
        assert(halfEther - takerFeeDue - gasCost == (await exchange.balanceOf(etherAddress, taker)).toNumber(), "taker fees taken correctly");

        //fees
        assert(takerFeeDue + makerFeeDue + gasCost == (await exchange.balanceOf(etherAddress, feeAccount)).toNumber(), "all fees credited correctly");
    });


    it("simple trade USDtoken<->tokens works correctly and ether and gas fees match", async () => {

        //

        await exchange.approveCurrencyTokenAddress(tokenUSD.address, true, {from: admin});

        await tokenUSD.approve(exchange.address, oneHundredTokens, {from: maker});
        await exchange.depositToken(tokenUSD.address, oneHundredTokens, {from: maker});

        await exchange.deposit({from: maker, value: oneEther});

        //
        await token.approve(exchange.address, oneHundredTokens, {from: taker});
        await exchange.depositToken(token.address, oneHundredTokens, {from: taker});
        //
        await exchange.deposit({from: taker, value: oneEther});

        let orderNonce = getNonce();
        let tradeNonce = getNonce();

        //sign order
        let orderHash = utils.soliditySha3(exchange.address, token.address, fiftyTokens, 
            tokenUSD.address, twentyFiveTokens, makerExpires, orderNonce, maker);
        let signedOrderHash = await web3.eth.sign(maker, orderHash);
        let [r1, s1, v1] = getRSV(signedOrderHash);

        //sign trade
        let tradeHash = utils.soliditySha3(exchange.address, tokenUSD.address, twentyFiveTokens, 
            token.address, fiftyTokens, makerExpires, tradeNonce, taker);
        let signedTradeHash = await web3.eth.sign(taker, tradeHash);
        let [r2, s2, v2] = getRSV(signedTradeHash);

        const gasLimit = 4000000;
        const gasPrice = web3.toWei(1, 'gwei');
        const gasCost = oneEther;

        //prepare arguments
        let tradeValues = [fiftyTokens, twentyFiveTokens, orderNonce, twentyFiveTokens, fiftyTokens,
            makerExpires, tradeNonce, fiftyTokens, twentyFiveTokens, makerExpires, gasCost];
        let tradeAddresses = [token.address, tokenUSD.address, maker, taker];
        let v = [v1, v2];
        let rs = [r1, s1, r2, s2];

        //execute
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        let takerFeeDue = twentyFiveTokens * (2 / 1000);
        let makerFeeDue = twentyFiveTokens * (1 / 1000);

        //taker
        assert(twentyFiveTokens - takerFeeDue - gasCost == (await exchange.balanceOf(tokenUSD.address, taker)).toNumber(), "taker has correct USD tokens");
        assert(fiftyTokens == (await exchange.balanceOf(token.address, taker)).toNumber(), "taker tokens taken correctly");

        //maker
        assert(oneHundredTokens - twentyFiveTokens - makerFeeDue == (await exchange.balanceOf(tokenUSD.address, maker)).toNumber(), "maker has usd token - trade");
        assert(fiftyTokens  == (await exchange.balanceOf(token.address, maker)).toNumber(), "maker gets tokens from trade");

        let tradeFees = new BigNumber(makerFeeDue + takerFeeDue);
        let gasExpense = new BigNumber(gasCost);

        assert(gasExpense.plus(tradeFees) == (await exchange.balanceOf(tokenUSD.address, feeAccount)).toNumber(), "all fees credited correctly");
    });

    it("simple trade tokens<->USDtokens works correctly and ether and gas fees match", async () => {

        //
        await exchange.approveCurrencyTokenAddress(tokenUSD.address, true, {from: admin});

        await tokenUSD.approve(exchange.address, oneHundredTokens, {from: maker});
        await exchange.depositToken(tokenUSD.address, oneHundredTokens, {from: maker});

        await tokenUSD.approve(exchange.address, oneHundredTokens, {from: taker});
        await exchange.depositToken(tokenUSD.address, oneHundredTokens, {from: taker});

        await exchange.deposit({from: maker, value: oneEther});

        //
        await token.approve(exchange.address, oneHundredTokens, {from: maker});
        await exchange.depositToken(token.address, oneHundredTokens, {from: maker});
        //
        await exchange.deposit({from: taker, value: oneEther});

        let orderNonce = getNonce();
        let tradeNonce = getNonce();

        //sign order
        let orderHash = utils.soliditySha3(exchange.address, tokenUSD.address, fiftyTokens, 
            token.address, fiftyTokens, makerExpires, orderNonce, maker);
        let signedOrderHash = await web3.eth.sign(maker, orderHash);
        let [r1, s1, v1] = getRSV(signedOrderHash);

        //sign trade
        let tradeHash = utils.soliditySha3(exchange.address, token.address, fiftyTokens, 
            tokenUSD.address, fiftyTokens, makerExpires, tradeNonce, taker);
        let signedTradeHash = await web3.eth.sign(taker, tradeHash);
        let [r2, s2, v2] = getRSV(signedTradeHash);

        const gasLimit = 4000000;
        const gasPrice = web3.toWei(1, 'gwei');
        const gasCost = oneEther*100;

        //prepare arguments
        let tradeValues = [fiftyTokens, fiftyTokens, orderNonce, fiftyTokens, fiftyTokens,
            makerExpires, tradeNonce, fiftyTokens, fiftyTokens, makerExpires, gasCost];
        let tradeAddresses = [tokenUSD.address, token.address, maker, taker];
        let v = [v1, v2];
        let rs = [r1, s1, r2, s2];

        //execute
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        let takerFeeDue = fiftyTokens * 2 / 1000;
        let makerFeeDue = fiftyTokens * 1 / 1000;

        //taker
        // max of ten USD tokens can be taken
        assert(fiftyTokens - takerFeeDue - oneEther * 10 == (await exchange.balanceOf(tokenUSD.address, taker)).toNumber(), "taker has fifty USD tokens");
        assert(fiftyTokens == (await exchange.balanceOf(token.address, taker)).toNumber(), "taker fees taken correctly");

        //maker
        let startTokens = new BigNumber(oneHundredTokens);
        let tradedTokens = new BigNumber(fiftyTokens);
        let makerFeeTraded = new BigNumber(makerFeeDue);
        assert(startTokens.plus(tradedTokens).minus(makerFeeTraded) == (await exchange.balanceOf(tokenUSD.address, maker)).toNumber(), "maker has all the tokens");
        assert(fiftyTokens == (await exchange.balanceOf(token.address, maker)).toNumber(), "maker fees taken correctly");

        //fees
        let takerFeeTraded = new BigNumber(takerFeeDue);
        let gasExpense = new BigNumber(oneEther * 10); // max expense is 10 USD tokens
        assert(makerFeeTraded.plus(takerFeeTraded).plus(gasExpense) == (await exchange.balanceOf(tokenUSD.address, feeAccount)).toNumber(), "all fees credited correctly");
    });

    it("simple trade tokens<->tokens works correctly and ether and gas fees match", async () => {

        //maker wants to sell tokens for ether
        await token.approve(exchange.address, oneHundredTokens, {from: maker});
        await exchange.depositToken(token.address, oneHundredTokens, {from: maker});

        await token.approve(exchange.address, oneHundredTokens, {from: taker});
        await exchange.depositToken(token.address, oneHundredTokens, {from: taker});

        //maker needs ether in the account for fees
        await exchange.deposit({from: maker, value: oneEther});

        //taker wants to give ether for tokens
        await exchange.deposit({from: taker, value: oneEther});

        let orderNonce = getNonce();
        let tradeNonce = getNonce();

        //sign order
        let orderHash = utils.soliditySha3(exchange.address, token.address, oneHundredTokens, 
            token.address, oneHundredTokens, makerExpires, orderNonce, maker);
        let signedOrderHash = await web3.eth.sign(maker, orderHash);
        let [r1, s1, v1] = getRSV(signedOrderHash);

        //sign trade
        let tradeHash = utils.soliditySha3(exchange.address, token.address, oneHundredTokens, 
            token.address, oneHundredTokens, makerExpires, tradeNonce, taker);
        let signedTradeHash = await web3.eth.sign(taker, tradeHash);
        let [r2, s2, v2] = getRSV(signedTradeHash);

        const gasLimit = 4000000;
        const gasPrice = web3.toWei(1, 'gwei');
        const gasCost = gasLimit*gasPrice;

        //prepare arguments
        let tradeValues = [oneHundredTokens, oneHundredTokens, orderNonce, oneHundredTokens, oneHundredTokens,
            makerExpires, tradeNonce, oneHundredTokens, oneHundredTokens, makerExpires, gasCost];
        let tradeAddresses = [token.address, token.address, maker, taker];
        let v = [v1, v2];
        let rs = [r1, s1, r2, s2];

        //execute
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        let takerFeeDue = halfEther * 2 / 1000;
        let makerFeeDue = halfEther * 1 / 1000;
        
        //  test = await exchange.balanceOf(token.address, maker)

        // console.log(test);

        // test = await exchange.balanceOf(token.address, taker)

        // console.log(test);
        // //maker
        // assert(0 == (await exchange.balanceOf(token.address, maker)).toNumber(), "maker has zero tokens");
        // assert(oneAndHalfEther - makerFeeDue == (await exchange.balanceOf(etherAddress, maker)).toNumber(), "maker fees taken correctly");

        // //taker
        // assert(oneHundredTokens == (await exchange.balanceOf(token.address, taker)).toNumber(), "taker has all the tokens");
        // assert(halfEther - takerFeeDue - gasCost == (await exchange.balanceOf(etherAddress, taker)).toNumber(), "taker fees taken correctly");

        // //fees
        // assert(takerFeeDue + makerFeeDue + gasCost == (await exchange.balanceOf(etherAddress, feeAccount)).toNumber(), "all fees credited correctly");
    });

    it("simple trade tokens<->eth works self trade", async () => {

        //maker wants to sell tokens for ether
        await token.approve(exchange.address, oneHundredTokens, {from: maker});
        await exchange.depositToken(token.address, oneHundredTokens, {from: maker});

        // change exchange 
        //maker needs ether in the account for fees
        await exchange.deposit({from: maker, value: oneEther});

        //taker wants to give ether for tokens
        await exchange.deposit({from: taker, value: oneEther});

        let orderNonce = getNonce();
        let tradeNonce = getNonce();

        //sign order
        let orderHash = utils.soliditySha3(exchange.address, etherAddress, halfEther, 
            token.address, oneHundredTokens, makerExpires, orderNonce, maker);
        let signedOrderHash = await web3.eth.sign(maker, orderHash);
        let [r1, s1, v1] = getRSV(signedOrderHash);

        //sign trade
        let tradeHash = utils.soliditySha3(exchange.address, token.address, oneHundredTokens, 
            etherAddress, halfEther, makerExpires, tradeNonce, maker);
        let signedTradeHash = await web3.eth.sign(maker, tradeHash);
        let [r2, s2, v2] = getRSV(signedTradeHash);

        const gasLimit = 4000000;
        const gasPrice = web3.toWei(1, 'gwei');
        const gasCost = gasLimit*gasPrice;

        //prepare arguments
        let tradeValues = [halfEther, oneHundredTokens, orderNonce, oneHundredTokens, halfEther,
            makerExpires, tradeNonce, halfEther, oneHundredTokens, makerExpires, gasCost];
        let tradeAddresses = [etherAddress, token.address, maker, maker];
        let v = [v1, v2];
        let rs = [r1, s1, r2, s2];

        //execute
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        let takerFeeDue = halfEther * 2 / 1000;
        let makerFeeDue = halfEther * 1 / 1000;
        
        // //maker
        // assert(0 == (await exchange.balanceOf(token.address, maker)).toNumber(), "maker has zero tokens");
        // assert(oneAndHalfEther - makerFeeDue == (await exchange.balanceOf(etherAddress, maker)).toNumber(), "maker fees taken correctly");

        // //taker
        // assert(oneHundredTokens == (await exchange.balanceOf(token.address, taker)).toNumber(), "taker has all the tokens");
        // assert(halfEther - takerFeeDue - gasCost == (await exchange.balanceOf(etherAddress, taker)).toNumber(), "taker fees taken correctly");

        // //fees
        // assert(takerFeeDue + makerFeeDue + gasCost == (await exchange.balanceOf(etherAddress, feeAccount)).toNumber(), "all fees credited correctly");
    });
})