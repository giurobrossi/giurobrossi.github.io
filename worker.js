console.log("SW startup");

self.addEventListener('install', function(event) {
  console.log("SW installed");
  caches.open('cache-v1').then(function(cache) {
  	return cache.addAll([
  		'/logo_ucresearch.png',
  		'/offline.html'
  		]);
  })
});


self.addEventListener('activate', function(event) {
  console.log("SW activated");
});


self.addEventListener('fetch', function(event) {
	//event.respondWith(new Response("Hijacked Site!!"));
	var requestURL = new URL(event.request.url);

	event.respondWith(
		caches.match(event.request).then(function(response) {
		  return response || fetch(event.request);
		}).catch(function(){
			return caches.match('/offline.html');
		})
  	);
});