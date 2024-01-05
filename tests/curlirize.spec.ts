import { expect } from 'chai';
import axios, {AxiosRequestConfig} from "axios";
import {curlirize} from "../src/main";
import { CurlHelper } from "../src/lib/CurlHelper";
import qs from 'qs'

curlirize(axios);

describe("Testing curlirize", () => {
  it("should return a 200 with the value 'world'", (done) => {
    axios.post("http://localhost:7500/", { dummy: "data" })
        .then((res) => {
          expect(res.status).to.eq(200);
          expect(res.data.hello).to.eq("world");
          done();
        })
        .catch((err) => {
          //@ts-ignore
          console.error(err);
        });
  });
  it("should allow to remove curlirize part on a request", (done) => {
    axios.post("http://localhost:7500/", { dummy: "data" })
        .then((res) => {
          expect(res.status).to.eq(200);
          expect(res.data.hello).to.eq("world");
          //@ts-ignore
          res.config.clearCurl();
          //@ts-ignore
          expect(res.config.curlObject).to.be.eq(undefined);
          //@ts-ignore
          expect(res.config.curlCommand).to.be.eq(undefined);
          //@ts-ignore
          expect(res.config.clearCurl).to.be.eq(undefined);
          done();
        })
        .catch((err) => {
          //@ts-ignore
          console.error(err);
        });
  });

  it("should return a generated command with XML as data", (done) => {
    axios.post("http://localhost:7500", "<myTestTag></myTestTag>")
      .then((res) => {
        //@ts-ignore
        expect(res.config.curlObject.getBody()).to.eq("--data '<myTestTag></myTestTag>'");
        //@ts-ignore
        expect(res.config.curlCommand).to.contain("<myTestTag></myTestTag>");
        done();
      })
      .catch((err) => {
        //@ts-ignore
        console.error(err);
      });
  });

  it("should return the response with the defined curl command", (done) => {
    axios.post("http://localhost:7500/", { dummy: "data" })
      .then((res) => {
        //@ts-ignore
        expect(res.config.curlCommand).to.eq(`curl -X POST "http://localhost:7500/" -H "Accept:application/json, text/plain, */*" -H "Content-Type:undefined" --data '{"dummy":"data"}'`);
        done();
      })
      .catch((err) => {
        //@ts-ignore
        console.error(err);
      });
  });

  it("should return the generated command with no --data attribute", (done) => {
    axios.post("http://localhost:7500/")
      .then((res) => {
        //@ts-ignore
        expect(res.config.curlCommand).to.eq(`curl -X POST "http://localhost:7500/" -H "Accept:application/json, text/plain, */*" -H "Content-Type:undefined"`);
        done();
      })
      .catch((err) => {
        //@ts-ignore
        console.error(err);
      });
  });

  it("should return the generated command with headers specified on method call", (done) => {
    axios.post("http://localhost:7500/", null, {headers: {Authorization: "Bearer 123", testHeader: "Testing"}})
      .then((res) => {
        //@ts-ignore
        expect(res.config.curlCommand).to.eq('curl -X POST "http://localhost:7500/" -H "Accept:application/json, text/plain, */*" -H "Content-Type:undefined" -H "Authorization:Bearer 123" -H "testHeader:Testing"');
        done();
      })
      .catch((err) => {
        //@ts-ignore
        console.error(err);
      });
  });

  it("should return the generated command with a queryString specified in the URL", (done) => {
    axios.post("http://localhost:7500/", null, {params: {test: 1}})
      .then((res) => {
        //@ts-ignore
        expect(res.config.curlCommand).to.eq('curl -X POST "http://localhost:7500/?test=1" -H "Accept:application/json, text/plain, */*" -H "Content-Type:undefined"');
        done();
      })
      .catch((err) => {
        //@ts-ignore
        console.error(err);
      });
  });

  it("should return the generated command with a queryString specified in the URL with paramsSerializer", (done) => {
    const api = axios.create({
      paramsSerializer: (params) => {
        return qs.stringify(params)
      }
    })
    curlirize(api)
    api.post("http://localhost:7500/", null, {params: {test: 1, text: 'sim'}})
      .then((res) => {
        //@ts-ignore
        expect(res.config.curlCommand).to.eq('curl -X POST "http://localhost:7500/?test=1&text=sim" -H "Accept:application/json, text/plain, */*" -H "Content-Type:undefined"');
        done();
      })
      .catch((err) => {
        //@ts-ignore
        console.error(err);
      });
  });

  it("do not add ? if params is empty", (done) => {
    axios.post("http://localhost:7500/", null)
      .then((res) => {
        //@ts-ignore
        expect(res.config.curlCommand).to.eq('curl -X POST "http://localhost:7500/" -H "Accept:application/json, text/plain, */*" -H "Content-Type:undefined"');
        done();
      })
      .catch((err) => {
        //@ts-ignore
        console.log('--', err)
        //@ts-ignore
        console.error(err);
      });
  });

  it("do not cut end slash", (done) => {
    const api = axios.create({
      baseURL: 'http://localhost:7500',
    })
    curlirize(api)
    api.post("api/", null, {params: {test: 1, text: 'sim'}})
      .then((res) => {
        //@ts-ignore
        expect(res.config.curlCommand).to.eq('curl -X POST "http://localhost:7500/api/?test=1&text=sim" -H "Accept:application/json, text/plain, */*" -H "Content-Type:undefined"');
        done();
      })
      .catch((err) => {
        //@ts-ignore
        console.error(err);
      });
  });

  it("cut middle slash", (done) => {
    const api = axios.create({
      baseURL: 'http://localhost:7500/',
    })
    curlirize(api)
    api.post("/api/", null, {params: {test: 1, text: 'sim'}})
      .then((res) => {
        //@ts-ignore
        expect(res.config.curlCommand).to.eq('curl -X POST "http://localhost:7500/api/?test=1&text=sim" -H "Accept:application/json, text/plain, */*" -H "Content-Type:undefined"');
        done();
      })
      .catch((err) => {
        //@ts-ignore
        console.error(err);
      });
  });
});

describe("Testing curl-helper module", () => {
  const fakeConfig = {
    adapter: () => { return "dummy"; },
    transformRequest: { "0": () => { return "dummy"; } },
    transformResponse: { "0": () => { return "dummy"; } },
    timeout: 0,
    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-XSRF-TOKEN",
    maxContentLength: -1,
    validateStatus: () => { return "dummy"; },
    headers: { Accept: "application/json, text/plain, */*", "Content-Type": "application/json;charset=utf-8" },
    method: "post",
    url: "http://localhost:7500/",
    data: { dummy: "data" },
    params: { testParam: "test1", testParamTwo: "test2"}
  };
  // @ts-ignore
  const curl = new CurlHelper(fakeConfig);

  it("should return an empty string if data is undefined", (done) => {
    let emptyConfig = {
      adapter: () => { return "dummy" },
      transformRequest: { "0": () => { return "dummy" } },
      transformResponse: { "0": () => { return "dummy" } },
      timeout: 0,
      xsrfCookieName: "XSRF-TOKEN",
      xsrfHeaderName: "X-XSRF-TOKEN",
      maxContentLength: -1,
      validateStatus: () => { return "dummy" },
      headers: { Accept: "application/json, text/plain, */*", "Content-Type": "application/json;charset=utf-8" },
      method: "post",
      url: "http://localhost:7500/",
      data: undefined
    };
    // @ts-ignore
    const emptyDataCurl = new CurlHelper(emptyConfig);
    expect(emptyDataCurl.getBody()).to.eq("");
    done();
  });

  it("should return an empty string if data is == empty string", (done) => {
    let emptyConfig = {
      adapter: () => { return "dummy" },
      transformRequest: { "0": () => { return "dummy" } },
      transformResponse: { "0": () => { return "dummy" } },
      timeout: 0,
      xsrfCookieName: "XSRF-TOKEN",
      xsrfHeaderName: "X-XSRF-TOKEN",
      maxContentLength: -1,
      validateStatus: () => { return "dummy" },
      headers: { Accept: "application/json, text/plain, */*", "Content-Type": "application/json;charset=utf-8" },
      method: "post",
      url: "http://localhost:7500/",
      data: ""
    };
    // @ts-ignore
    const emptyDataCurl = new CurlHelper(emptyConfig);
    expect(emptyDataCurl.getBody()).to.eq('');
    done();
  });

  it("should return {} as --data if req data is == {}", (done) => {
    let emptyConfig: AxiosRequestConfig = {
      //@ts-ignore
      adapter: (config: AxiosRequestConfig) => { return Promise.resolve("dummy") },
      //@ts-ignore
      transformRequest: { "0": () => { return "dummy" } },
      //@ts-ignore
      transformResponse: { "0": () => { return "dummy" } },
      timeout: 0,
      xsrfCookieName: "XSRF-TOKEN",
      xsrfHeaderName: "X-XSRF-TOKEN",
      maxContentLength: -1,
      validateStatus: (status: number) => { return true },
      headers: { Accept: "application/json, text/plain, */*", "Content-Type": "application/json;charset=utf-8" },
      method: "POST",
      url: "http://localhost:7500/",
      data: {}
    };
    const emptyDataCurl = new CurlHelper(emptyConfig);
    expect(emptyDataCurl.getBody()).to.eq("--data '{}'");
    done();
  });

  it("should return a string with headers", (done) => {
    expect(curl.getHeaders()).to.eq("-H \"Accept:application/json, text/plain, */*\" -H \"Content-Type:application/json;charset=utf-8\"");
    done();
  });

  it("should return a string with HTTP method", (done) => {
    expect(curl.getMethod()).to.eq("-X POST");
    done();
  });

  it("should return a string with request body", (done) => {
    expect(curl.getBody()).to.eq(`--data '{"dummy":"data"}'`);
    done();
  });

  it("should return the URL of the request", (done) => {
    expect(curl.getUrl()).to.eq("http://localhost:7500/");
    done();
  });

  it("should return the queryString of the request", (done) => {
    expect(curl.getQueryString()).to.eq("?testParam=test1&testParamTwo=test2");
    done();
  });
});
