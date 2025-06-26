import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Spinner } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { fetchBotPrices } from '../api';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function PriceHistory({ botId }) {
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coinData, setCoinData] = useState({});
  const chartRef = useRef(null);

  useEffect(() => {
    loadPriceHistory();
    const interval = setInterval(loadPriceHistory, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [botId]);
  
  // Process price history data whenever it changes
  useEffect(() => {
    if (priceHistory.length > 0) {
      // Group by coin
      const newCoinData = {};
      priceHistory.forEach(record => {
        if (!newCoinData[record.coin]) {
          newCoinData[record.coin] = {
            prices: [],
            timestamps: []
          };
        }
        newCoinData[record.coin].prices.push(record.price);
        newCoinData[record.coin].timestamps.push(new Date(record.timestamp).toLocaleTimeString());
      });
      
      setCoinData(newCoinData);
    }
  }, [priceHistory]);

  const loadPriceHistory = async () => {
    try {
      // Get last 24 hours of price history
      const toTime = new Date();
      const fromTime = new Date(toTime.getTime() - 24 * 60 * 60 * 1000);
      const data = await fetchBotPrices(botId, fromTime, toTime);
      setPriceHistory(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching price history:', err);
      setError('Failed to load price history');
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = () => {
    if (!Object.keys(coinData).length) return null;

    return {
      labels: coinData[Object.keys(coinData)[0]].timestamps,
      datasets: Object.entries(coinData).map(([coin, data]) => ({
        label: coin,
        data: data.prices,
        fill: false,
        borderColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
        tension: 0.1
      }))
    };
  };

  if (loading) {
    return (
      <div className="text-center p-4">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  // Prepare chart data based on the current coinData
  const chartData = prepareChartData();

  return (
    <div>
      {error && (
        <div className="alert alert-danger mb-4">{error}</div>
      )}

      {chartData ? (
        <>
          <div style={{ height: '400px' }}>
            <Line
              ref={chartRef}
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: false,
                    ticks: {
                      callback: value => `$${value.toLocaleString()}`
                    }
                  }
                },
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: context => `${context.dataset.label}: $${context.parsed.y.toLocaleString()}`
                    }
                  },
                  legend: {
                    display: true
                  }
                }
              }}
            />
          </div>
          
          <Table className="mt-4" hover>
            <thead>
              <tr>
                <th>Coin</th>
                <th>Current Price</th>
                <th>24h Change</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(coinData).map(([coin, data]) => {
                const currentPrice = data.prices[data.prices.length - 1];
                const prevPrice = data.prices[0];
                const priceChange = ((currentPrice - prevPrice) / prevPrice) * 100;
                
                return (
                  <tr key={coin}>
                    <td>{coin}</td>
                    <td>${currentPrice.toLocaleString()}</td>
                    <td className={priceChange >= 0 ? 'text-success' : 'text-danger'}>
                      {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                    </td>
                    <td>{new Date(data.timestamps[data.timestamps.length - 1]).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </>
      ) : (
        <p className="text-center text-muted">No price data available</p>
      )}
    </div>
  );
}

export default PriceHistory;
