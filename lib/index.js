const { Annotation, Request } = require('zipkin');

/**
 * Wrapper for the axios HTTP-client.
 *
 */
class AxiosWrapper {

  /**
   * Override default constructor.
   *
   */
  constructor(axios, { tracer, serviceName = 'unknown', remoteServiceName }) {
    this.axios = axios;
    this.tracer = tracer;
    this.serviceName = serviceName;
    this.remoteServiceName = remoteServiceName;
  }

  /**
   * Sends a GET-Request to the given url.
   */
  get(url, opt = {}) {
    opt.method = 'GET';
    return this.sendRequest(url, opt);
  }

  /**
   * Sends a PUT-Request to the given url.
   *
   */
  put(url, data, opt = {}) {
    opt.method = 'PUT';
    opt.data = data;
    return this.sendRequest(url, opt);
  }

  /**
   * Sends a PATCH-Request to the given url.
   *
   */
  patch(url, data, opt = {}) {
    opt.method = 'PATCH';
    opt.data = data;
    return this.sendRequest(url, opt);
  }

  /**
   * Sends a POST-Request to the given url.
   *
   */
  post(url, data, opt = {}) {
    opt.method = 'POST';
    opt.data = data;
    return this.sendRequest(url, opt);
  }

  /**
   * Sends a DELETE-Request to the given url.
   *
   */
  del(url, opt = {}) {
    opt.method = 'DELETE';
    return this.sendRequest(url, opt);
  }

  /**
   * Sends a HEAD-Request to the given url.
   *
   */
  head(url, opt = {}) {
    opt.method = 'HEAD';
    return this.sendRequest(url, opt);
  }

  /**
   * Sends a OPTIONS-Request to the given url.
   *
   */
  options(url, opt = {}) {
    opt.method = 'OPTIONS';
    return this.sendRequest(url, opt);
  }

  /**
   * Wrapper for axios.request
   * Here we create the scope and record the annotations.
   *
   */
  sendRequest(url, opts) {
    const { axios, tracer, serviceName } = this;
    const { method } = opts;

    return new Promise((resolve, reject) => {
      tracer.scoped(() => {
        tracer.setId(tracer.createChildId());
        const traceId = tracer.id;

        tracer.recordServiceName(serviceName);
        tracer.recordRpc(method.toUpperCase());
        tracer.recordBinary('http.url', url);
        tracer.recordAnnotation(new Annotation.ClientSend());

        const config = Request.addZipkinHeaders(opts, traceId);
        config.url = url;
        axios.request(config)
        .then(result => {
          tracer.scoped(() => {
            tracer.setId(traceId);
            tracer.recordBinary('http.status_code', result.status.toString());
            tracer.recordAnnotation(new Annotation.ClientRecv());
          });
          resolve(result);
        })
        .catch(err => {
          tracer.scoped(() => {
             tracer.setId(traceId);
             tracer.recordBinary('request.error', err.toString());
             tracer.recordAnnotation(new Annotation.ClientRecv());
           });
           reject(err);
        });
      });
    });
  }

};

/**
 * Instrument the given axios instance.
 *
 * @param  {object} axios   The axios instance to Instrument
 * @param  {object} options Options in the form: { tracer, serviceName, remoteServiceName}
 * @return {AxiosWrapper}   The wrapped axios instance
 */
module.exports = function wrapAxios(axios, options) {
  return new AxiosWrapper(axios, options);
};
