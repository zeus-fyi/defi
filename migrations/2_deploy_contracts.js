var Exchange = artifacts.require("Exchange");
var TokenMock = artifacts.require("TokenMock");
var OptionFactory = artifacts.require("OptionFactory");
var DexBrokerage = artifacts.require("DexBrokerage");

module.exports = function(deployer, network, accounts) {
    //where fees will go - accounts[4]
    deployer.deploy(DexBrokerage, 1000000000000000, 2000000000000000, accounts[4], 0)
        .then(function(){
            return DexBrokerage.deployed();
        })
        .then(function(exchangeInstance){
            //exchangeInstance.setInactivityReleasePeriod(0);
        });

    deployer.deploy(TokenMock, "TokenMock", "TKM", 18)
        .then(function(){
            return TokenMock.deployed();
        })
        .then(function(tokenMockInstance){
            tokenMockInstance.mint(accounts[0], 10000000000000000000000);
            tokenMockInstance.mint(accounts[0], 10000000000000000000000);
            //deployer.deploy(OptionFactory, TokenMock.address, 10000000000000000000000);
        })

};
