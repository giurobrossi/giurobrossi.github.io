var CACHE_NAME = 'cache-db-v1';
var CACHE_URLS = ['/no_connection.html',
									'/offline_logo.png',
									'/img1_cache.jpg',
									'/img2_cache.jpg',
									'/img3_cache.jpg'];

/**
 * Si mette in ascolto dell'evento INSTALL del SW, ma esso non scatterà finchè:
 * 1. Venga creata una CACHE locale ('cache-db)
 * 2. I file dichiarati nell'array 'urlToBeCached' non siano stati scaricati dal web e immagazzinati nella cache locale.
 * 
 * NB: il processo di fetch è asincrono, per cui occorre usare il barrier 'waitUntil' per attendere che tutti i file 
 * siano stati scaricati.
 */
self.addEventListener('install', function(event) {
  console.log('SW Install Event Captured, with cache version: ' + CACHE_NAME);
	event.waitUntil(
		caches.open(CACHE_NAME).then(function(cache) {
			return cache.addAll(CACHE_URLS);
		})
	);
});


/**
 * Durante la gestione dell'evento ACTIVATE faccio pulizia delle cache generate da versioni precedenti di questo script,
 * nell'ipotesi di aggiornare il suffisso cache-db-v1,2,3... ad ogni nuova versione di questo file.
 * 
 * Ad ogni modifica di questo file, corrisponde automaticamente la creazione di un nuovo ServiceWorker che si pone 
 * in attesa che il vecchio SW venga eliminato dal proprio ciclo di vita. Per evitare di spaccare il meccanismo di 
 * recupero file dalla cache, nel caso in cui vi siano client diversi con versioni diverse dello script (che banalmente
 * potrebbe aver modificato CACHED_URLS) si adotta la convenzione di aggiornare (a build time) la variabile CACHE_NAME.
 */
self.addEventListener('activate', function(event) {
	console.log('SW Activate Event Captured');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (CACHE_NAME !== cacheName && cacheName.startsWith('cache-db')) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});


/**
 * Il Proxy con cache locale (SW) intercetta tutte le request e consente di:
 * 1. Recuperarle dalla cache locale se presenti
 * 2. Oppure scaricarle dal Web se non presenti 
 * 3. Se la connessione manca, e la pagina da scaricare non è cachata, mostra la pagina di fallback 
 * no_connection.html leggendola dalla cache (tale pagina viene cachata all'inizio).
 */
self.addEventListener('fetch', function(event) {
	console.log('SW Fetch Event Captured: ' + event.request.url);
	var requestURL = new URL(event.request.url);
	event.respondWith(
		caches.match(event.request, {ignoreSearch: true}).then(function(response) {
		  return response || fetch(event.request);
		}).catch(function(){
				return caches.match('/no_connection.html');
		})
  );
});


/**
 * Questo script usa l'approccio "Cache first, falling back to Network":
 * --------------------------------------------------------------------
 * self.addEventListener('fetch', function(event) {
 *  event.respondWith(
 *   caches.match(event.request).then(function(cachedResponse) {
 *     return cachedResponse || fetch(event.request);
 *   })
 * );
 * });
 * 
 Questo va bene nel caso di risorse cachate che non cambiano spesso lato server. Se invece il tasso di aggiornamento 
 di tali risorse è alto, occorrono approcci più sofisticati. 
 
 Il seguente prevede che venga servito sempre prima il contenuto della cache, scaricando il file dal web e
 inserendolo nella cache (asincronicamente) per essere letto la volta seguente dalla cache.

	self.addEventListener('fetch', function(event) {
		event.respondWith(
				cache.match(event.request).then(function(cachedResponse) {
					var fetchPromise = fetch(event.request).then(function(networkResponse) {
						cache.put(event.request, networkResponse.clone());
						return networkResponse;
					})
					return cachedResponse || fetchPromise;
				})
		);
	}); 

*/


