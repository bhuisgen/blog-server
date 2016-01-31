var config = {
  outputs: [{
    'name': 'squarethumb',
    'size': 75
  }, {
    'name': 'thumbnail',
    'size': 100
  }, {
    'name': 'small',
    'size': 240
  }, {
    'name': 'mediumsmall',
    'size': 320
  }, {
    'name': 'medium',
    'size': 460
  }, {
    'name': 'large',
    'size': 520
  }, {
    'name': 'verylarge',
    'size': 600
  }],

  filename: '%name%-%output%'
};

module.exports = config;
