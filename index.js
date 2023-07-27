const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = 3000;

// app.get('/', (req, res) => {
//   res.sendFile(__dirname + '/public/index.html');
//   res.sendFile(__dirname + '/public/style.css');
// });

app.use(express.static('public'));

function quartile(data, q) {
  data = sort_array(data);
  var pos = ((data.length) - 1) * q;
  var base = Math.floor(pos);
  var rest = pos - base;
  if( (data[base+1]!==undefined) ) {
    return data[base] + rest * (data[base+1] - data[base]);
  } else {
    return data[base];
  }
}

function sort_array(array){
  return array.sort(function(a, b) {
    return a - b;
  });
}

app.get('/listings', async (req, res) => {
    var input = req.query.query;
    input = input.replaceAll(",", "%2C").replaceAll(" ", "%20");
    var condition = req.query.condition;

    // Generate URL
    var url = 'https://www.ebay.com/sch/i.html?' + '_nkw=' + input + '&LH_Complete=1&LH_Sold=1'
    if (condition == 'new') {
        url += '&ItemCondition=3';
    } else if (condition == 'used') {
        url += '&ItemCondition=4';
    }
    console.log('Fetching data from ' + url);

    // Fetch data 
    const results = await axios.get(url);
    const $ = cheerio.load(results['data']);
    const listings = $(".s-item__info");
    
    // Go through each listing
    var listing_data = [];
    var prices = [];
    for (var listing of listings) {
        var sold_date = $(listing).children('.s-item__caption-section').text();
        
        // Skip if this isn't a valid listing
        if (sold_date == '') {
            continue;
        }

        // Otherwise continue
        var sold_date = sold_date.split('Sold ')[1].trim();
        var link = $(listing).children('a.s-item__link').prop('href');         
        var title = $(listing).find('div.s-item__title').text();     

        // Parse out numbers
        var price_text = $(listing).find('span.s-item__price').text();
        var price_num = parseFloat(price_text.slice(1)); // Trim $
        var shipping_text = $(listing).find('span.s-item__shipping').text();
        if (shipping_text == 'Free shipping' || shipping_text == '') {
            var shipping_num = 0;
        } else {
            var shipping_num = parseFloat(shipping_text.slice(2).split(" ")[0]); // Trim +$ and shipping
        }
        var combined_price = (price_num + shipping_num);

        // Store data
        var data = {'title': title, 'sold_date': sold_date, 'link': link, 'price_text': price_text, 'shipping_text': shipping_text, 'price_num': price_num, 'shipping_num': shipping_num, 'combined_price': combined_price};
        listing_data.push(data);
        prices.push(combined_price);
    } 

    // Sort listing data by price
    listing_data.sort((a, b) => a['combined_price'] - b['combined_price']);

    // Calculate metrics    
    prices.sort((a, b) => {
        if (a < b) {
          return -1;
        }
        if (a > b) {
          return 1;
        }
        return 0;
      });
    var low = (prices[0]).toFixed(2);
    var average = (prices.reduce((a, b) => a + b) / prices.length).toFixed(2);
    var high = prices[prices.length - 1].toFixed(2);

    var p25 = quartile(prices, .25).toFixed(2);
    var p50 = quartile(prices, .50).toFixed(2);
    var p75 = quartile(prices, .75).toFixed(2);
    var metrics = {'Low': low, 'Average': average, 'High': high, 'P25': p25, 'P50': p50, 'P75': p75};

    var data_to_return = {'listing_data': listing_data, 'prices': prices, 'metrics': metrics};
    res.status(200).json(data_to_return);
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
