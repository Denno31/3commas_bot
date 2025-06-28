import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Spinner } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { fetchBotPrices } from '../api';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function PriceHistory({ botId }) {
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processedCoins, setProcessedCoins] = useState({});
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
      const newData = {};
      priceHistory.forEach(record => {
        if (!newData[record.coin]) {
          newData[record.coin] = {
            prices: [],
            timestamps: []
          };
        }
        newData[record.coin].prices.push(record.price);
        newData[record.coin].timestamps.push(new Date(record.timestamp).toLocaleTimeString());
      });
      
      setProcessedCoins(newData);
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
    if (!priceHistory.length) return { chartData: null, processedData: {} };

    // Group by coin
    const processedData = {};
    priceHistory.forEach(record => {
      if (!processedData[record.coin]) {
        processedData[record.coin] = {
          prices: [],
          timestamps: []
        };
      }
      processedData[record.coin].prices.push(record.price);
      // Store the timestamp as both raw value and formatted string for different uses
      processedData[record.coin].timestamps.push(record.timestamp);
      processedData[record.coin].formattedTimes = processedData[record.coin].formattedTimes || [];
      processedData[record.coin].formattedTimes.push(new Date(record.timestamp).toLocaleTimeString());
    });
    
    if (!Object.keys(processedData).length) return { chartData: null, processedData: {} };

    const chartData = {
      labels: processedData[Object.keys(processedData)[0]].formattedTimes,
      datasets: Object.entries(processedData).map(([coin, data]) => ({
        label: coin,
        data: data.prices,
        fill: false,
        borderColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
        tension: 0.1
      }))
    };

    return { chartData, processedData };
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <Spinner animation="border" />
        <span className="ml-2">Loading price history...</span>
      </div>
    );
  }

  // Prepare chart data based on the current price history
  const { chartData, processedData } = prepareChartData();

  return (
    <div>
      {error && (
        <div className="alert alert-danger mb-4">{error}</div>
      )}

      {chartData && Object.keys(processedData).length > 0 ? (
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
              {Object.entries(processedData).map(([coin, data]) => {
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
                    <td>{typeof data.timestamps[data.timestamps.length - 1] === 'string' 
                        ? new Date(data.timestamps[data.timestamps.length - 1]).toLocaleString() 
                        : new Date(Date.parse(data.timestamps[data.timestamps.length - 1])).toLocaleString()}</td>
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
