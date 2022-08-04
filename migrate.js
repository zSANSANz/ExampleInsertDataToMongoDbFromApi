const mongo = require('mongodb');
const chalk = require('chalk');
const url = "mongodb://172.16.255.40:27017/chatnews_cron";
const async = require('async');
const request = require('request');

// start the work
mongo.connect(url, {useNewUrlParser: true}, (err, db) => {
    if(err) {
       console.log(err);
       process.exit(0);
    }
    var dbo = db.db('chatnews_cron');
    var collection = dbo.collection('posts');
    // grab posts

    var options = {
        'headers': {
            'Authorization': 'Bearer auth',
            'Content-Type': 'application/json'
          }
    }
    request('https://wordpress/wp-json/wp/v2/posts?per_page=100&page=5', options, (err, response, body) => {
        let data = JSON.parse(body);
        let userData = [];
        // console.log(data);
        data.forEach(singleData => {
            async.waterfall([
                (callback) => {
                    // get the featured image
                    request(`https://wordpress/wp-json/wp/v2/media/${singleData.featured_media}`,options, (err, res, body) => {
                        if(err) {
                            console.log(err);
                            return callback(null, null);
                        }
                        let data = JSON.parse(body);
                        console.log('featued image = ', data.source_url);
                        return callback(null, data.source_url);
                    });
                },
            ], (err, image, cats, tags) => {
                let parseContent = JSON.parse(JSON.stringify(singleData.content));
                let formatContent = parseContent.rendered.split("\n").join('');
                let formatContentspaces = formatContent.split("\t").join('');
                let postData = {
                    id: singleData.id,
                    title: singleData.title.rendered,
                    date: singleData.date,
                    url: singleData.link,            
                    slug: singleData.slug,
                    status: singleData.status,
                    type: singleData.type,                
                    excerpt: singleData.excerpt.rendered,
                    content: formatContentspaces,
                    author: singleData.author,
                    categories: singleData.categories,
                    tags: singleData.tags,
                    featured_image: image
                };
                collection.insert(postData, (err, result) => {
                    if(err) {
                        console.log(err);
                        process.exit(0);
                    }
                    console.log(result);
                });
            });
        });  
    });
});