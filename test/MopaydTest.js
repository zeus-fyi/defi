const TokenMock = artifacts.require('./utils/TokenMock.sol');
const Mopayd = artifacts.require('./Mopayd.sol');

var utils = require('web3-utils');
const Utils = require("./Utils.js");
var BigNumber = require('bignumber.js');

let owner;
let customer;
let merchant;
let admin;
let feeAccount;

let etherAddress = '0x0000000000000000000000000000000000000000';

let token;
let oneToken = web3.toWei("1", "ether"); // new BigNumber(1).pow(18) //web3.utils.toWei("1", "ether");
let fiveTokens = web3.toWei("5", "ether"); // new BigNumber(1).pow(18) //web3.utils.toWei("1", "ether");
let oneHundredTokens = web3.toWei("100", "ether"); //new BigNumber(100).pow(18) //

let tenFinney = web3.toWei("10", "finney"); //new BigNumber(0.01).pow(18)

let nonce = 0;
let orderExpires = '10000';
const inactivityReleasePeriod = 20000;

contract('MopaydTests', (accounts) => {

    beforeEach(async () => {
        owner       = accounts[0];
        customer    = accounts[1];
        merchant    = accounts[2];
        admin       = accounts[3];
        feeAccount  = accounts[4];

        tokenUSD = await TokenMock.new('USD', 'T1', 18);
        paymentToken = tokenUSD.address

        await tokenUSD.mint(customer, oneHundredTokens);
        await tokenUSD.mint(merchant, oneHundredTokens);

        payments = await Mopayd.new(feeAccount, inactivityReleasePeriod);
        paymentsAddress = payments.address
        await payments.setAdmin(admin, true);

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

    it("deposit of token and eth works", async () => {
        await tokenUSD.approveAndDeposit(paymentsAddress, oneHundredTokens, {from: customer});
        assert(oneHundredTokens == (await payments.balanceOf(tokenUSD.address, customer)).toNumber(), "Token deposit works correctly");

        await payments.deposit(customer, {from: customer, value: tenFinney});
        assert(tenFinney == (await payments.balanceOf(etherAddress, customer)).toNumber(), "Eth deposit works correctly");
    });

    it("eth withdraw works", async () => {

        await payments.deposit(customer, {from: customer, value: tenFinney});
        assert(tenFinney == (await payments.balanceOf(etherAddress, customer)).toNumber(), "Customer balance is credited properly");

        const startCustomerBalance = web3.eth.getBalance(customer);

        const feeDue = 0;
        const nonce = getNonce();
        let withdrawHash = utils.soliditySha3(paymentsAddress, etherAddress, tenFinney, customer, customer, nonce, 0);
        let signedWithdrawHash = await web3.eth.sign(customer, withdrawHash);
        let [r, s, v] = getRSV(signedWithdrawHash);

        await payments.adminWithdraw(etherAddress, tenFinney, customer, customer, nonce, v, r, s, 0, {from: admin});

        const newCustomerEthBalance = web3.eth.getBalance(customer)

        assert(newCustomerEthBalance - startCustomerBalance == tenFinney, "Customer has received withdrawn funds from customer account");
    });   

    it("token withdraw works", async () => {
        // customer deposits tokens
        await tokenUSD.approveAndDeposit(payments.address, oneHundredTokens, {from: customer});

        const feeDue = 0;
        const nonce = getNonce();
        let withdrawHash = utils.soliditySha3(paymentsAddress, paymentToken, oneHundredTokens, customer, customer, nonce, 0);
        let signedWithdrawHash = await web3.eth.sign(customer, withdrawHash);
        let [r, s, v] = getRSV(signedWithdrawHash);

        await payments.adminWithdraw(paymentToken, oneHundredTokens, customer, customer, nonce, v, r, s, 0, {from: admin});
        assert(0  == (await payments.balanceOf(paymentToken, customer)), "Withdrawal works correctly from customer");
        assert(oneHundredTokens == (await tokenUSD.balanceOf(customer)).toNumber(), "Customer has received withdrawn funds from customer account");
    });  

    it("token deposit from other works", async () => {
        // approve tokens for deposit
        await tokenUSD.approve(paymentsAddress, oneHundredTokens, {from: customer});

        // check that owner has no prior balance
        assert(0 == (await payments.balanceOf(paymentToken, owner)).toNumber(), "Owner has no prior balance");

        // deposit one hundred tokens to owners account
        await payments.depositToken(paymentToken, owner, oneHundredTokens, {from: customer});
        assert(oneHundredTokens == (await payments.balanceOf(paymentToken, owner)).toNumber(), "Owners balance is credited properly");

        const feeDue = 0;
        const nonce = getNonce();
        let withdrawHash = utils.soliditySha3(paymentsAddress, paymentToken, oneToken, owner, owner, nonce, 0);
        let signedWithdrawHash = await web3.eth.sign(owner, withdrawHash);
        let [r, s, v] = getRSV(signedWithdrawHash);

        await payments.adminWithdraw(paymentToken, oneToken, owner, owner, nonce, v, r, s, 0, {from: admin});
        assert(oneHundredTokens - oneToken == (await payments.balanceOf(paymentToken, owner)), "Withdrawal works correctly");
        assert(oneToken == (await tokenUSD.balanceOf(owner)).toNumber(), "Owner has withdrawn funds deposited by external account");

    });

    it("token withdraw to other works", async () => {
        // customer deposits tokens
        await tokenUSD.approveAndDeposit(payments.address, oneHundredTokens, {from: customer});

        // check that owner has no prior balance
        assert(0 == (await tokenUSD.balanceOf(owner)).toNumber(), "Owner has no prior balance");

        const feeDue = 0;
        const nonce = getNonce();
        let withdrawHash = utils.soliditySha3(paymentsAddress, paymentToken, oneToken, customer, owner, nonce, 0);
        let signedWithdrawHash = await web3.eth.sign(customer, withdrawHash);
        let [r, s, v] = getRSV(signedWithdrawHash);

        await payments.adminWithdraw(paymentToken, oneToken, customer, owner, nonce, v, r, s, 0, {from: admin});
        assert(oneHundredTokens - oneToken == (await payments.balanceOf(paymentToken, customer)), "Withdrawal works correctly from customer");
        assert(oneToken == (await tokenUSD.balanceOf(owner)).toNumber(), "Owner has received withdrawn funds from customer account");
    });  

    it("eth deposit from other works", async () => {
        const startCustomerEthBalance = web3.eth.getBalance(customer);

        // deposit one hundred tokens to owners account from customer
        await payments.deposit(owner, {from: customer, value: tenFinney});

        assert(tenFinney == (await payments.balanceOf(etherAddress, owner)).toNumber(), "Owners balance is credited properly");
        assert(web3.eth.getBalance(customer) <= startCustomerEthBalance - tenFinney, "Customer Eth balance is debited properly");

    });

    it("eth withdraw to other works", async () => {

        const startOwnerEthBalance = web3.eth.getBalance(owner);

        await payments.deposit(customer, {from: customer, value: tenFinney});
        assert(tenFinney == (await payments.balanceOf(etherAddress, customer)).toNumber(), "Customer balance is credited properly");

        const feeDue = 0;
        const nonce = getNonce();
        let withdrawHash = utils.soliditySha3(paymentsAddress, etherAddress, tenFinney, customer, owner, nonce, 0);
        let signedWithdrawHash = await web3.eth.sign(customer, withdrawHash);
        let [r, s, v] = getRSV(signedWithdrawHash);

        await payments.adminWithdraw(etherAddress, tenFinney, customer, owner, nonce, v, r, s, 0, {from: admin});

        const newOwnerEthBalance = web3.eth.getBalance(owner)

        assert(newOwnerEthBalance - startOwnerEthBalance == tenFinney, "Owner has received withdrawn funds from customer account");
    });   

    it("transfer tokens from customer to merchant works", async () => {
        await tokenUSD.approveAndDeposit(payments.address, oneHundredTokens, {from: customer});

        const amountTotal = oneHundredTokens
        const paymentNonce  = getNonce();

        const maxTotalFee = fiveTokens
        let amountToPay = fiveTokens
        const txFee = oneToken

        const paymentToken = tokenUSD.address

        const paymentHash = utils.soliditySha3(payments.address, amountTotal, paymentNonce, orderExpires, maxTotalFee, paymentToken, merchant);

        const signedPaymentHash = await web3.eth.sign(customer, paymentHash);

        const [r, s, v] = getRSV(signedPaymentHash);
        const rs = [r, s];

        const gasLimit = 4000000;
        const gasPrice = web3.toWei("1", 'gwei');
        const gasCost = gasLimit*gasPrice;

        //prepare arguments order 1
        let paymentValues = [amountTotal, paymentNonce, orderExpires, maxTotalFee, amountToPay, txFee];
        const paymentAddresses = [paymentToken, merchant, customer];

        // console.log(await payments.balanceOf(paymentToken, customer))
        // console.log(await payments.balanceOf(paymentToken, merchant))

        //execute payment
        await payments.sendPayment(paymentValues, paymentAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        // console.log(await payments.balanceOf(paymentToken, customer))
        // console.log(await payments.balanceOf(paymentToken, merchant))
        // console.log(await payments.balanceOf(paymentToken, feeAccount))

        const expectedBalanceTx1 = oneHundredTokens - amountToPay - txFee
        assert(expectedBalanceTx1 == (await payments.balanceOf(paymentToken, customer)), "correct payment sent by customer");
        // //console.log(await payments.balanceOf(tokenUSD.address, merchant), 'fee', new BigNumber(processingFeeDue))
        assert(amountToPay  == (await payments.balanceOf(tokenUSD.address, merchant)).toNumber(), "merchant has received payment");
        assert(txFee == (await payments.balanceOf(paymentToken, feeAccount)).toNumber(), "all fees credited correctly");

        amountToPay = oneToken
        paymentValues = [amountTotal, paymentNonce, orderExpires, maxTotalFee, amountToPay, txFee];

        await payments.sendPayment(paymentValues, paymentAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});
        assert(expectedBalanceTx1 - txFee - amountToPay == (await payments.balanceOf(paymentToken, customer)), "correct payment sent by customer");
    });

    it("Delegation from customer to owner spending works", async () => {

        // delegate to owner
        let delegationHash = utils.soliditySha3(paymentsAddress, customer, owner, nonce,);
        let signedDelegationHash = await web3.eth.sign(customer, delegationHash);
        let [r, s, v] = getRSV(signedDelegationHash);
        await payments.delegatePaymentControl(customer, owner, nonce, v, r, s, true, {from: admin});

        await tokenUSD.approveAndDeposit(payments.address, oneHundredTokens, {from: customer});

        const amountTotal = oneHundredTokens
        const paymentNonce  = getNonce();
        const maxTotalFee = fiveTokens
        let amountToPay = fiveTokens
        const txFee = oneToken
        const paymentToken = tokenUSD.address

        // sign with owner
        const paymentHash = utils.soliditySha3(payments.address, amountTotal, paymentNonce, orderExpires, maxTotalFee, paymentToken, merchant);
        const signedPaymentHash = await web3.eth.sign(owner, paymentHash);

        [r, s, v] = getRSV(signedPaymentHash);
        const rs = [r, s];

        const gasLimit = 4000000;
        const gasPrice = web3.toWei("1", 'gwei');
        const gasCost = gasLimit*gasPrice;

        //prepare arguments order 1
        let paymentValues = [amountTotal, paymentNonce, orderExpires, maxTotalFee, amountToPay, txFee];
        const paymentAddresses = [paymentToken, merchant, customer];

        //execute payment
        await payments.sendPayment(paymentValues, paymentAddresses, v, rs, {from: admin, gas: gasLimit, gasPrice: gasPrice});

        assert(oneHundredTokens - amountToPay - txFee == (await payments.balanceOf(paymentToken, customer)), "correct payment sent by customer");
        assert(amountToPay  == (await payments.balanceOf(tokenUSD.address, merchant)).toNumber(), "merchant has received payment");
        assert(txFee == (await payments.balanceOf(paymentToken, feeAccount)).toNumber(), "all fees credited correctly");

    });
})
