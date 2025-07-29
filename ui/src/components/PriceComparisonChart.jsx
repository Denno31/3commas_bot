import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Spinner, Badge, Form, Row, Col } from 'react-bootstrap';
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
import { fetchPriceComparison, fetchHistoricalComparison } from '../api';

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

/**
 * Component to visualize price movements since initial snapshot
 * @param {Object} props - Component props
 * @param {string} props.botId - ID of the bot to fetch data for
 */
function PriceComparisonChart({ botId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [priceComparisonData, setPriceComparisonData] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h'); // Default to 24 hours
  const [selectedCoin, setSelectedCoin] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const chartRef = useRef(null);
  
  // Time range options in milliseconds
  const timeRanges = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '3d': 3 * 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };

  // Load data on component mount and when dependencies change
  useEffect(() => {
    if (!botId) return;
    
    loadPriceComparison();
    loadHistoricalComparison();
    
    // Set up auto-refresh
    let refreshTimer = null;
    if (autoRefresh) {
      refreshTimer = setInterval(() => {
        loadPriceComparison();
        loadHistoricalComparison();
      }, 60000); // Refresh every minute
    }
    
    return () => {
      if (refreshTimer) clearInterval(refreshTimer);
      
      // Destroy chart instance when component unmounts to prevent canvas reuse errors
      if (chartRef.current && chartRef.current.chartInstance) {
        chartRef.current.chartInstance.destroy();
      }
    };
  }, [botId, selectedTimeRange, selectedCoin, autoRefresh]);

  /**
   * Load current price comparison data
   */
  const loadPriceComparison = async () => {
    try {
      setLoading(true);
      const data = await fetchPriceComparison(botId);
      setPriceComparisonData(data.priceComparisons);
      setLastRefreshed(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching price comparison:', err);
      setError('Failed to load price comparison data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load historical comparison data
   */
  const loadHistoricalComparison = async () => {
    try {
      setLoading(true);
      const options = {
        fromTime: new Date(Date.now() - timeRanges[selectedTimeRange]),
        toTime: new Date()
      };
      
      // Add coin filter if specific coin is selected
      if (selectedCoin !== 'all') {
        options.coin = selectedCoin;
      }
      
      const data = await fetchHistoricalComparison(botId, options);
      setHistoricalData(data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching historical comparison:', err);
      setError('Failed to load historical price data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Prepare chart data from historical data
   * @returns {Object} Chart data object for Chart.js
   */
  const prepareChartData = () => {
    if (!historicalData || !historicalData.length) return null;
    
    // Extract unique timestamps for x-axis
    const allTimestamps = new Set();
    historicalData.forEach(coin => {
      if (coin.prices) {
        coin.prices.forEach(price => {
          allTimestamps.add(price.timestamp);
        });
      }
    });
    
    // Sort timestamps chronologically
    const sortedTimestamps = Array.from(allTimestamps).sort();
    
    // Prepare datasets for each coin
    const datasets = historicalData.map((coin, index) => {
      // Get initial price from snapshot
      const initialPrice = coin.snapshot?.initialPrice || null;
      
      // Create a map of timestamp to price data for this coin
      const priceMap = {};
      coin.prices.forEach(price => {
        priceMap[price.timestamp] = price;
      });
      
      // Map price data to percentage changes from initial price
      const data = [];
      sortedTimestamps.forEach((timestamp, i) => {
        const price = priceMap[timestamp];
        if (price && initialPrice) {
          // Calculate percentage change from initial price
          data.push(price.percentChange || ((price.price - initialPrice) / initialPrice) * 100);
        } else {
          data.push(null);
        }
      });
      
      // Get a color based on index
      const hue = (index * 30) % 360;
      
      return {
        label: coin.coin,
        data: data,
        fill: false,
        borderColor: `hsl(${hue}, 70%, 50%)`,
        backgroundColor: `hsla(${hue}, 70%, 50%, 0.5)`,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.1,
        borderWidth: 2,
        initialPrice: initialPrice
      };
    });
    
    // Format timestamps for display
    const formattedLabels = sortedTimestamps.map(timestamp => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
    
    return {
      labels: formattedLabels,
      datasets: datasets
    };
  };

  /**
   * Handle time range change
   */
  const handleTimeRangeChange = (event) => {
    setSelectedTimeRange(event.target.value);
  };

  /**
   * Handle coin selection change
   */
  const handleCoinChange = (event) => {
    setSelectedCoin(event.target.value);
  };

  /**
   * Handle auto-refresh toggle
   */
  const handleAutoRefreshChange = (event) => {
    setAutoRefresh(event.target.checked);
  };

  /**
   * Format percentage value for display
   */
  const formatPercentage = (value) => {
    if (value === null || value === undefined) return 'N/A';
    
    const formatted = value.toFixed(2);
    return `${value >= 0 ? '+' : ''}${formatted}%`;
  };

  const chartData = prepareChartData();
  
  // Get unique coins from price comparison data for the dropdown
  const uniqueCoins = priceComparisonData ? 
    [...new Set(priceComparisonData.map(item => item.coin))] : 
    [];

  return (
    <div className="price-comparison-chart">
      {error && (
        <div className="alert alert-danger mb-4">{error}</div>
      )}
      
      <Card className="mb-4">
        <Card.Header className="bg-light">
          <Row className="align-items-center">
            <Col xs={12} md={6}>
              <h5 className="m-0">Price Movement Since Initial Snapshot</h5>
            </Col>
            <Col xs={12} md={6}>
              <div className="d-flex flex-wrap justify-content-md-end mt-2 mt-md-0">
                <Form.Group className="me-2 mb-2" controlId="timeRangeSelect">
                  <Form.Select 
                    size="sm"
                    value={selectedTimeRange} 
                    onChange={handleTimeRangeChange}
                  >
                    <option value="1h">Last hour</option>
                    <option value="6h">Last 6 hours</option>
                    <option value="12h">Last 12 hours</option>
                    <option value="24h">Last 24 hours</option>
                    <option value="3d">Last 3 days</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                  </Form.Select>
                </Form.Group>
                
                <Form.Group className="me-2 mb-2" controlId="coinSelect">
                  <Form.Select 
                    size="sm"
                    value={selectedCoin} 
                    onChange={handleCoinChange}
                  >
                    <option value="all">All coins</option>
                    {uniqueCoins.map(coin => (
                      <option key={coin} value={coin}>{coin}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                
                <Form.Group className="me-2 mb-2 d-flex align-items-center" controlId="autoRefresh">
                  <Form.Check 
                    type="switch"
                    id="auto-refresh-switch"
                    label={<span className="ms-1 small">Auto refresh</span>}
                    checked={autoRefresh}
                    onChange={handleAutoRefreshChange}
                  />
                </Form.Group>
                
                {lastRefreshed && (
                  <div className="mb-2">
                    <Badge bg="light" text="dark" className="small">
                      <i className="bi bi-arrow-clockwise me-1"></i>
                      {lastRefreshed.toLocaleTimeString()}
                    </Badge>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </Card.Header>
        
        <Card.Body>
          {loading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
              <Spinner animation="border" />
              <span className="ms-2">Loading price data...</span>
            </div>
          ) : chartData ? (
            <div style={{ height: '400px' }}>
              <Line
                ref={chartRef}
                data={chartData}
                options={{
                  // Destroy old chart instance before creating a new one
                  plugins: {
                    beforeInit: function(chart) {
                      if (chart.canvas.id && chart.canvas.id !== '') {
                        const existingChart = ChartJS.getChart(chart.canvas.id);
                        if (existingChart) {
                          existingChart.destroy();
                        }
                      }
                    }
                  },
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      grid: {
                        display: true,
                        drawOnChartArea: true,
                      },
                      ticks: {
                        maxTicksLimit: 10,
                        maxRotation: 0,
                        autoSkip: true
                      },
                    },
                    y: {
                      title: {
                        display: true,
                        text: 'Change from initial price (%)'
                      },
                      ticks: {
                        callback: value => `${value.toFixed(2)}%`
                      },
                      grid: {
                        display: true,
                      }
                    }
                  },
                  plugins: {
                    tooltip: {
                      callbacks: {
                        title: context => {
                          const date = new Date(context[0].parsed.x);
                          return date.toLocaleString();
                        },
                        label: context => {
                          const dataset = context.dataset;
                          const value = context.parsed.y;
                          const coin = dataset.label;
                          const initialPrice = dataset.initialPrice;
                          
                          return [
                            `${coin}: ${formatPercentage(value)}`,
                            `Initial price: $${initialPrice?.toLocaleString() || 'N/A'}`
                          ];
                        }
                      }
                    },
                    legend: {
                      display: true,
                      position: 'top',
                      labels: {
                        boxWidth: 12,
                        usePointStyle: true,
                        padding: 20
                      }
                    },
                    title: {
                      display: true,
                      text: 'Price Movement Since Initial Snapshot',
                      font: {
                        size: 16
                      },
                      padding: {
                        top: 10,
                        bottom: 20
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <p className="text-center text-muted">No price data available</p>
          )}
        </Card.Body>
      </Card>
      
      {/* Price Comparison Table */}
      <Card>
        <Card.Header className="bg-light">
          <h5 className="m-0">Price Comparison Summary</h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100px' }}>
              <Spinner animation="border" size="sm" />
              <span className="ms-2">Loading price data...</span>
            </div>
          ) : (
            <Table responsive hover className="mt-3">
              <thead>
                <tr>
                  <th>Coin</th>
                  <th>Initial Price</th>
                  <th>Current Price</th>
                  <th>Change (%)</th>
                  <th>Snapshot Date</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {priceComparisonData && priceComparisonData.length > 0 ? (
                  priceComparisonData.map(coin => (
                    <tr key={coin.coin}>
                      <td><strong>{coin.coin}</strong></td>
                      <td>${coin.initialPrice.toLocaleString()}</td>
                      <td>${coin.currentPrice ? coin.currentPrice.toLocaleString() : 'N/A'}</td>
                      <td className={coin.percentChange >= 0 ? 'text-success' : 'text-danger'}>
                        {formatPercentage(coin.percentChange)}
                      </td>
                      <td>{new Date(coin.snapshotTimestamp).toLocaleDateString()}</td>
                      <td>{coin.lastUpdated ? new Date(coin.lastUpdated).toLocaleString() : 'N/A'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center text-muted">No price comparison data available</td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
          
          <Card.Text className="text-muted mt-3 small">
            <i className="bi bi-info-circle me-1"></i>
            This table compares the initial snapshot price of each coin with its current price.
            Positive percentages indicate price increases since the initial snapshot was taken.
          </Card.Text>
        </Card.Body>
      </Card>
    </div>
  );
}

export default PriceComparisonChart;
