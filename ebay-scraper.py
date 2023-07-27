from bs4 import BeautifulSoup
from urllib.request import urlopen

# Pulling data
url = "https://www.ebay.com/sch/i.html?_from=R40&_nkw=polaroid+now+%22everything+box%22&_sacat=0&LH_TitleDesc=0&LH_Complete=1&LH_Sold=1&rt=nc&LH_ItemCondition=3"
page = urlopen(url)
html = page.read().decode("utf-8")
content = BeautifulSoup(html, "html.parser")

listings = content.find_all("div", class_="s-item__info")

# Go through each listing 
prices = []
listing_data = []
total = 0
for div in listings: 
    # Parsing out data from each listing 
    sold_date_div = div.find("div", class_="s-item__caption-section")
    link_div = div.find("a", class_="s-item__link")
    title_div = div.find("div", class_="s-item__title")
    price_div = div.find("span", class_="s-item__price")
    shipping_div = div.find("span", class_="s-item__shipping")

    # Discard if it's not a valid listing
    if sold_date_div == None: 
        continue 

    # Process data into the format we want
    sold_date = sold_date_div.text.split("Sold ")[1].strip()
    link = link_div.get("href") 
    title = title_div.text

    # Process all the various prices 
    price_text = price_div.text
    price_num = float(price_text[1:])
    shipping_text = shipping_div.text 
    if shipping_text == 'Free shipping':
        shipping_num = 0
    else: 
        shipping_num = float(shipping_text[2:].split(" ")[0])
    combined_price =  price_num + shipping_num

    # Store data
    data = {'title': title, 'sold_date': sold_date, 'link': link, 'price': price_text, 'shipping': shipping_text}
    if len(prices) == 0: 
        prices.append(combined_price)
    else: 
        i = 0;
        for price in prices: 
            if combined_price < price: 
                prices.insert(i, combined_price)
                listing_data.insert(i, data)
                total += combined_price
                break        
            else: 
                i += 1

                # If the latest price is the highest price, add it to the end
                if (combined_price > price) and (i == len(prices)):
                    prices.append(combined_price)
                    listing_data.append(data)
                    total += combined_price

    # print('Listing: ')
    # print(data)
    # print(' ')
    # print('Prices thus far: ')
    # print(prices)
    # print(' ')

low = prices[0]
average = total / len(prices)
high = prices[len(prices) - 1]

print('FINDINGS:')
print("Low: " + str(low))
print("Average: " + str(average))
print("High: " + str(high))
print(' ')
print(str(len(prices)) + ' results')

for item in listing_data: 
    print('Item: ' + item['title'])
    print('Link: ' + item['link'])
    print('Price: ' + item['price'])
    print('Shipping: ' + item['shipping'])
    print('Sold date: ' + item['sold_date'])
    print(' ')
