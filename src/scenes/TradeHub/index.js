import React, { Component } from 'react';
import './styles.css';

// Libraries
import binance from 'binance-api';

// Components
import Header from '../../components/Header';
import HorizontalTabList from '../../components/HorizontalTabList';
import InfoPanel from '../../components/InfoPanel';
import Chart from '../../components/Chart';

class TradeHub extends Component {
  constructor(props) {
    super(props);

    this.state = {
      cryptoList: [],
      selectedCrypto: {symbol:"ETHBTC", baseAsset:"ETH", quoteAsset:"BTC"},
      currentPrice: 0.08,
      boughtPrice: 0.07,
      diffPercentage: 0.01,
      highestPrice: 0,
      messages: [],
      sellEnabled: false,
      hasSold: false,
      socketKeys: ["ETHBTC@kline_1m"]
    }

    binance.options({
      'APIKEY':      props.opts.binance.key,
      'APISECRET':   props.opts.binance.secret,
      'reconnect': false
    })

    // bindings
    this.setBoughtPrice = this.setBoughtPrice.bind(this);
    this.setDiffPercentage = this.setDiffPercentage.bind(this);
    this.toggleSellEnabled = this.toggleSellEnabled.bind(this);
    this.changeSelectedCrypto = this.changeSelectedCrypto.bind(this);
  }

  componentDidMount() {
    this.getCryptoList();
    this.bindSocket(this.state.selectedCrypto.symbol);
  }

  rebindSocket() {
    let newCrypto = this.state.selectedCrypto.symbol;
    let newEndpoint = newCrypto.toLowerCase() + "@kline_1m";
    let subscriptions = binance.websockets.subscriptions();

    for (let endpoint in subscriptions) {
      if (endpoint !== newEndpoint) { this.removeSocket(endpoint); }
    }

    this.bindSocket(newCrypto);
  }

  removeSocket(endpoint) {
    binance.websockets.terminate(endpoint);
  }

  bindSocket = (symbol) => {
    binance.websockets.candlesticks([symbol], "1m", (candlesticks) => {
      let { k:ticks } = candlesticks;
      let { c:close } = ticks;
      //console.log(symbol+" "+interval+" candlestick update");
      let currentPrice = parseFloat(close);
      this.setState({
        currentPrice: currentPrice
      })
      this.checkPrice(currentPrice);
    });
  }

  getCryptoList() {
    fetch("https://api.binance.com/api/v1/exchangeInfo").then((res) => {
      return res.json();
    }).then((data) => {
      let cryptoList = [];

      let symbols = data.symbols;
      for (var i = 0; i < symbols.length; i++) {
          cryptoList.push(symbols[i]);
      }

      if (cryptoList.length > 0) {
        this.setState({
          cryptoList: cryptoList,
          selectedCrypto: cryptoList[0]
        });
      }
    })
  }

  checkPrice(currentPrice) {
    if (currentPrice > this.state.boughtPrice) {
      if (this.isHighestPrice(currentPrice)) {
        this.setHighestPrice(currentPrice);
        return;
      }

      if (this.shouldSell(currentPrice)) {
        this.sell(currentPrice);
        return;
      }
    }
  }

  isHighestPrice(currentPrice) {
    let isHighestPrice = currentPrice > this.state.highestPrice;
    return isHighestPrice;
  }

  setHighestPrice(currentPrice) {
    this.setState({
      highestPrice: currentPrice
    })
  }

  shouldSell(currentPrice) {
    if (this.state.sellEnabled && !this.state.hasSold) {
      let shouldSell = (currentPrice <= (this.state.highestPrice - this.state.highestPrice * this.state.diffPercentage));
      return shouldSell;
    }
  }

  sell(currentPrice) {
    alert("SOLD at " + currentPrice);
    this.setState({
      hasSold: true
    })
  }

  setBoughtPrice(e) {
    this.setState({
      boughtPrice: e.target.value
    })
  }

  setDiffPercentage(e) {
    let diffPercentage = (e.target.value / 100);
    this.setState({
      diffPercentage: diffPercentage
    })
  }

  toggleSellEnabled() {
    this.setState({
      sellEnabled: !this.state.sellEnabled
    })
  }

  changeSelectedCrypto(symbol) {
    let crypto = this.state.cryptoList.find((obj) => { return obj.symbol === symbol; });
    if (crypto == null) { return; }

    binance.prices((ticker) => {
      this.setState({
        currentPrice: parseFloat(ticker[crypto.symbol])
      })
    });

    this.setState({
      selectedCrypto: crypto
    },() => { this.rebindSocket(); });
  }

  render() {
    let selectedCrypto = this.state.selectedCrypto;
    let currentPrice = this.state.currentPrice.toFixed(6);
    let highestPrice = this.state.highestPrice.toFixed(6);;
    let sellPrice = (highestPrice - highestPrice * this.state.diffPercentage).toFixed(6);
    let cryptoList = this.state.cryptoList;

    return (
      <div>
        <Header />

        <div className="container">
          <HorizontalTabList list={cryptoList} selectedItem={this.state.selectedCrypto} changeSelected={this.changeSelectedCrypto}/>
          <div className="row">
            <div className="col-sm"><InfoPanel title={selectedCrypto.quoteAsset + " " + currentPrice} description={selectedCrypto.baseAsset + " current price"}/></div>
            <div className="col-sm"><InfoPanel title={selectedCrypto.quoteAsset + " "  + highestPrice} description={selectedCrypto.baseAsset + " hightest price since bought"}/></div>
            <div className="col-sm"><InfoPanel title={selectedCrypto.quoteAsset + " "  + sellPrice} description={selectedCrypto.baseAsset + " price to sell on"}/></div>
          </div>
        </div>

        <div className="container mt-3">
          <div className="row">
            <div className="col-sm"><Chart selectedCrypto={this.state.selectedCrypto} /></div>
          </div>
        </div>

        <div>
          <h1>Current price: {this.state.currentPrice}</h1>
          <hr/>
          <h1>Bought at this price:</h1>
          <input
            type="number"
            step="0.01"
            placeholder="Price at which you bought."
            onChange={this.setBoughtPrice}
            value={this.state.boughtPrice}/>
          <hr/>
          <h1>Highest price since bought: {this.state.highestPrice}</h1>
          <hr/>
          <h1>Will sell at: {(this.state.highestPrice - this.state.highestPrice * this.state.diffPercentage)} </h1>
          <p>(only when the price is higher then the boughtPrice). <br/>
            Difference between highestprice and sell price is {(this.state.diffPercentage * 100).toFixed(2)}%</p>
            <input
              type="number"
              step="0.01"
              placeholder="Difference between highestprice and sell price."
              onChange={this.setDiffPercentage}
              value={(this.state.diffPercentage * 100).toFixed(2)}/>
          <hr/>
          <p>Can sell (if enabled, the bot will sell at {(this.state.highestPrice - this.state.highestPrice * this.state.diffPercentage)})</p>
          <input
            type="checkbox"
            onChange={this.toggleSellEnabled}
            checked={this.state.sellEnabled}/>
          <hr/>
          <h1>Sold: {this.state.hasSold.toString()}</h1>
        </div>
      </div>
    )
  }
}

export default TradeHub;
