Objective: to make a pure HTML + javascript presentation about fractals

# Architecture

Generate a static bundle of HTML, CSS, and JavaScript files that can be served from any web server. Slides are interactive. Use Reveal.js for the presentation framework.

# Style

* Prefer a dark theme with light text for better contrast and readability.
* Use a consistent font style and size throughout the presentation.
* Use animations and transitions to enhance the visual appeal of the slides, but avoid excessive use that may distract from the content.

# Slides

## Sierpinski triangle chaos game

* Display the three vertices of an equilateral triangle on the screen.
* First click of the mouse selects a vertex
* Second click of the mouse selects a point on the screen
* The algorithm will draw a line and put a point halfway between the current point and the chosen vertex. New point is called P.
* Next click selects a new vertex
* The algorithm will draw a line from P to the new vertex and put a point halfway between them. That's the new P.
* Clicking on a vertex will repeat the process, generating more points and revealing the Sierpiński triangle pattern.
* Pressing the space bar will continue the process automatically, generating points at a regular interval until the spacebar is pressed again to pause.
* After pause is triggered, fade in the following text at the bottom left "Sierpiński  Triangle". Overlay it on top of everything else. Below the text, display the formula S{i+1} = (1/2)(Si + V) where V is a vertex of the triangle.
* Name the vertices A, B, and C. The user can click on any of the three vertices to select it.
* Clicking and dragging pans the view of the triangle, allowing the user to explore different areas of the fractal.
* Scrolling the mouse wheel zooms in and out of the triangle, allowing the user to see more detail or a broader view of the fractal.
* Pressing "enter" or "arrow" goes to the next slide (since clicks are taken by the algorithm, not the presentation framework).
* Going back to the slides resets the slide

## Mandelbrot set

* Use the following library to render the Mandelbrot set:

https://deep-mandelbrot.js.org/
https://github.com/munrocket/deep-mandelbrot

* Allow the user to zoom in and out of the Mandelbrot set using mouse wheel scrolling (just like the library allows)
* Pressing "enter" or "arrow" goes to the next slide (since clicks are taken by the algorithm, not the presentation framework).
* Fade in the following text at the bottom left "Mandelbrot Set". Overlay it on top of everything else. Below the text, display the formula z_{n+1} = z_n^2 + c.

## Square

* Display a simple square of sides 1 on the screen
* At each click, fade in:
  * "Perimeter = 4"
  * "Area = 1"
* Next "enter" or "arrow" goes to the mandelbrot set

## Mandelbrot set (again)

Duplicate of the mandelbrot set slide, except that the next slide goes to barnsley fern

## Barnsley fern

* Render a barnsley fern on the screen
* Add sliders to control the parameters of the fern's iterative function system (IFS), allowing the user to see how changing these parameters affects the shape of the fern.
* Allow the user to zoom in and out of the fern using mouse wheel scrolling.
* Allow panning of the view by clicking and dragging the mouse.
* Fade in the following text at the bottom left "Barnsley Fern". Overlay it on top of everything else. Below the text, display the formula for the IFS that generates the fern.
* Pressing "enter" or "arrow" goes to the next slide (since clicks are taken by the algorithm, not the presentation framework).

## Nature

* Display images of natural fractals, such as trees, snowflakes, galaxies, lightning, and coastlines.

