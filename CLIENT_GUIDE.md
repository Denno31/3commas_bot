# Crypto Rebalancing Bot - Client Guide

## Overview

This bot helps you automatically trade cryptocurrencies on 3Commas based on price differences. It monitors your selected coins and makes trades when profitable opportunities arise.

## Recent Improvements

1. **More Reliable Price Data**
   - Now using CoinGecko API for accurate price data
   - Fallback system if one price source fails
   - Real-time price monitoring

2. **Enhanced Safety**
   - Paper trading mode for safe testing
   - Detailed logging of all decisions
   - Configurable trading thresholds

3. **Better Monitoring**
   - Price history in `data/analytics/prices/`
   - Trade logs in `logs/`
   - Bot state tracking in `data/bot_states/`

## How to Use

1. **Configuration** (`config.yaml`):
   ```yaml
   3commas:
     mode: "paper"  # Start with paper trading

   bots:
     - name: "Bot 1"
       enabled: true
       coins:
         - SOL_USDT
         - DOGE_USDT
         - SHIB_USDT
       threshold_percentage: 5  # Trade when price differs by 5%
       check_interval: 5  # Check prices every 5 minutes
   ```

2. **Start Trading**:
   - Begin with paper trading mode
   - Monitor the logs to see bot decisions
   - Check price analytics files daily

3. **Understanding Logs**:
   - Bot decisions are in `logs/bot.log`
   - Price history in `data/analytics/prices/`
   - Each trade attempt is logged with details

## Monitoring Your Bot

1. **Price History**
   - Found in `data/analytics/prices/Bot 1_YYYY-MM-DD.json`
   - Shows price changes over time
   - Helps verify trading opportunities

2. **Trade Logs**
   - Located in `logs/bot.log`
   - Shows when and why trades happen
   - Helps understand bot decisions

3. **Bot State**
   - In `data/bot_states/Bot_1.json`
   - Shows current holdings
   - Tracks trading history

## Best Practices

1. **Start Safe**
   - Use paper trading first
   - Start with small thresholds (2-5%)
   - Monitor for a few days before real trading

2. **Regular Checks**
   - Review logs daily
   - Check price analytics
   - Verify bot state

3. **Adjusting Settings**
   - Change thresholds if needed
   - Add/remove trading pairs
   - Modify check intervals

## Support

For any issues or questions:
1. Check the logs first
2. Review recent price history
3. Contact support with specific examples

## Safety Notes

1. Always backup your configuration
2. Test changes in paper trading mode
3. Start with small trade amounts
4. Monitor regularly when live trading
