class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}

class DependencyUnavailable extends HttpError {
  constructor(message) {
    super(503, message);
  }
}

class PaymentDeclined extends HttpError {
  constructor(message = 'Payment was declined') {
    super(402, message);
  }
}

module.exports = {
  DependencyUnavailable,
  HttpError,
  PaymentDeclined,
};

