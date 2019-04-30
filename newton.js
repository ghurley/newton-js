"use strict";

// The math stuff.
const root1 = {real: 1, imag:0};
const root2 = {real: -0.5, imag: Math.sqrt(3)/2};
const root3 = {real: -0.5, imag: -(Math.sqrt(3)/2)};

// JS has no complex number support but our needs here are pretty limited
// so we can just create a struct and a single multiplication function to
// do what we need.
var comp_new = function(real_part, imag_part) {
  return {real: real_part, imag: imag_part};
};

var comp_mult = function(c1, c2) {
  // (a+bi)(c+di) = (ac-bd)+(ad+bc)i
  return {real: c1.real * c2.real - c1.imag * c2.imag,
          imag: c1.real * c2.imag + c1.imag * c2.real};
};

// comp_approx_equal will return a bool that tells whether complex_num1
// and complex_num2 are (close to) equal. The imaginary and real portions
// are floats so we can't just check for equality on the component
// parts.
var comp_approx_equal = function(complex_num1, complex_num2, epsilon = 0.001) {
  return Math.abs(complex_num1.real - complex_num2.real) < epsilon &&
         Math.abs(complex_num1.imag - complex_num2.imag) < epsilon;
};

var newtons_method = function(complex_num) {
  const comp_squared = comp_mult(complex_num, complex_num);
  const comp_cubed = comp_mult(comp_squared, complex_num)
  let numerator = comp_new(comp_cubed.real - 1, comp_cubed.imag);
  let denominator = comp_mult(comp_new(3, 0), comp_squared);
  const conjugate = comp_new(denominator.real, -denominator.imag);

  numerator = comp_mult(numerator, conjugate);
  denominator = comp_mult(denominator, conjugate);
  // JS implementation of floats is useful here since division by 0 will return
  // NaN. The rest of the algorithm can handle that by essentially ignoring it.
  // Eventually, it will be colored black.
  return comp_mult(numerator, comp_new(1/denominator.real, 0));
};

var get_root_for_complex_point = function(comp_num) {
  let previous;
  let next = comp_num;
  let i = 0;

  for (; i < 30; ++i) {
    previous = next;
    let result = newtons_method(previous);
    next = comp_new(previous.real - result.real, previous.imag - result.imag);
    if (comp_approx_equal(next, previous)) {
      return {result: next, iterations: i};
    }
  }

  return {result: next, iterations: i};
};

const RED_C   = [255, 0,  0,  255];
const GREEN_C = [0,  255, 0,  255];
const BLUE_C  = [0,   0, 255, 255];
const BLACK_C = [0,   0,  0,  255];

var scale_color = function(color, scale) {
  let new_color = [];
  const divisor = Math.sqrt(scale);
  for (let i = 0; i < 3; ++i) {
    new_color[i] = color[i] / divisor;
  }
  new_color[3] = color[3];  // "Don't touch the alpha, man."
  return new_color;
};

var set_pixel = function(image_data, x, y, color) {
  const ix = (y * image_data.width + x) * 4;
  image_data.data[ix] = color[0];
  image_data.data[ix + 1] = color[1];
  image_data.data[ix + 2] = color[2];
  image_data.data[ix + 3] = color[3];
};


 // pixel_to_math_range returns a scale function that maps a pixel coordinate
 // (e.g. 620) to the mathematical value at that point as defined by the range
 // between `start` and `end`.
 // start: lowest mathematical value in the dimension (e.g. -1.5)
 // end: greatest mathematical value in the dimension (e.g. 1.5)
 // pixels: the number of pixels across which to map the mathematical range
 // scaler: optional scaler. Set to -1 to flip the mapping. Useful because
 // graphs tend to put lower y values at the bottom of the graph whereas
 // computer graphics systems tend to put the lower y values at the top of
 // the screen.
var pixel_to_math_range = function(start, end, pixels, scaler = 1) {
  const range = Math.max(start, end) - Math.min(start, end);
  return function(pixel_coord){
    return start + scaler * (range/pixels * pixel_coord);
  };
};




// The canvas bitmap stuff.
const vert_px = 480;
const vert_top = 1.5;
const vert_bottom = -1.5;
const imag_scale = pixel_to_math_range(vert_top, vert_bottom, vert_px, -1);

const horiz_px = 640;
const horiz_right = 2.0;
const horiz_left = -2.0;
const real_scale = pixel_to_math_range(horiz_left, horiz_right, horiz_px);

console.time('canvas init');
const draw_canvas = document.querySelector('#canvas');
draw_canvas.width = horiz_px;
draw_canvas.height = vert_px;
const ctx = draw_canvas.getContext('2d');
const img_data = ctx.createImageData(horiz_px, vert_px);
console.timeEnd('canvas init');

console.time('computation');
for (let y = 0; y < vert_px; ++y) {
  for (let x = 0; x < horiz_px; ++x) {

    const comp_num = comp_new(real_scale(x), imag_scale(y));
    const result = get_root_for_complex_point(comp_num);
    const res = result.result;

    // Need some way to color points for which we can't find a root before we
    // stop iterating. In the limit, this should only happen for 0 + 0i, for
    // which Newton's method goes nowhere but in practice, we can't iterate
    // forever and floating point numbers only have so much resolution.
    let color = BLACK_C;
    if (comp_approx_equal(res, root1)) {
      color = RED_C;
    } else if (comp_approx_equal(res, root2)) {
      color = GREEN_C;
    } else if (comp_approx_equal(res, root3)) {
      color = BLUE_C;
    }
    color = scale_color(color, result.iterations)
    set_pixel(img_data, x, y, color);
  }
}
console.timeEnd('computation');
ctx.putImageData(img_data, 0, 0);
