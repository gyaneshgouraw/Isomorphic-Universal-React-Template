import koa from 'koa';
import proxy from 'koa-proxy';
import serve from 'koa-static';
import html from './markup/html';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { RoutingContext, match } from 'react-router';
import { Provider } from 'react-redux';
import routes from '../routes';
import { instantiateStore } from '../shared';

const app      = koa();
const hostname = process.env.HOSTNAME || 'localhost';
const port     = process.env.PORT || 8000;

app.use(serve('static', {defer: true}));

app.use(function *(next) {
	const location = this.url;
	const webserver = process.env.NODE_ENV === 'production' ? '' : '//' + hostname + ':8080';


	yield ((callback) => {
		match({routes, location}, (error, redirectLocation, renderProps) => {
			if (redirectLocation) {
				this.redirect(redirectLocation.pathname + redirectLocation.search, '/');
				return;
			}

			if (error || !renderProps) {
				callback(error);
				return;
			}

			renderProps = renderProps || {};

			const store = instantiateStore();
			renderToString(<Provider store={store}><RoutingContext {...renderProps} /></Provider>); //trigger render

			store.async.taskAll().then(() => {
				const initialState = store.getState();
				const filledStore = instantiateStore(initialState);
				const appMarkup = renderToString(<Provider store={filledStore}><RoutingContext {...renderProps} /></Provider>);
				this.type = 'text/html';
				this.body = html({appMarkup, initialState});

				callback(null);
			})
		});
	});

	/*yield (callback => {
		store.async.promiseAll().then(() => {
			callback(null);
		})
	});

	this.body = 'hello world';*/
});


app.listen(port, () => {
	console.info('==> ✅  Server is listening');
	console.info('==>     Go to http://%s:%s', hostname, port);
});
