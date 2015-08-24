React Multi Slider
==================

CSS agnostic slider component for React

See demo: [https://qwtel.github.io/react-slider](https://qwtel.github.io/react-slider)

## Installation

```sh
npm install react-multi-slider
```

## Property types

```js
{
  /**
   * The minimum value of the slider.
   */
  min: PropTypes.number,

  /**
   * The maximum value of the slider.
   */
  max: PropTypes.number,

  /**
   * Value to be added or subtracted on each step the slider makes.
   * Must be greater than zero.
   * `max - min` should be evenly divisible by the step value.
   */
  step: PropTypes.number,

  /**
   * The minimal distance between any pair of handles.
   * Must be positive, but zero means they can sit on top of each other.
   */
  minDistance: PropTypes.number,

  /**
   * Determines the initial positions of the handles and the number of handles if the component has no children.
   *
   * If a number is passed a slider with one handle will be rendered.
   * If an array is passed each value will determine the position of one handle.
   * The values in the array must be sorted.
   * If the component has children, the length of the array must match the number of children.
   */
  defaultValue: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.arrayOf(PropTypes.number),
  ]),

  /**
   * Like `defaultValue` but for [controlled components](http://facebook.github.io/react/docs/forms.html#controlled-components).
   */
  value: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.arrayOf(PropTypes.number),
  ]),

  /**
   * Determines whether the slider moves horizontally (from left to right) or vertically (from top to bottom).
   */
  orientation: PropTypes.oneOf(['horizontal', 'vertical']),

  /**
   * The css class set on the slider node.
   */
  className: PropTypes.string,

  /**
   * Like `className`, but using React inlne styles.
   */
  style: PropTypes.object,

  /**
   * The css class set on each handle node.
   *
   * In addition each handle will receive a numbered css class of the form `${handleClassName}-${i}`,
   * e.g. `handle-0`, `handle-1`, ...
   */
  handleClassName: PropTypes.string,

  /**
   * The css class set on the handle that is currently being moved.
   */
  handleActiveClassName: PropTypes.string,

  /**
   * If `true` bars between the handles will be rendered.
   */
  withBars: PropTypes.bool,

  /**
   * The css class set on the bars between the handles.
   * In addition bar fragment will receive a numbered css class of the form `${barClassName}-${i}`,
   * e.g. `bar-0`, `bar-1`, ...
   */
  barClassName: PropTypes.string,

  /**
   * If `true` the active handle will push other handles
   * within the constraints of `min`, `max`, `step` and `minDistance`.
   */
  pearling: PropTypes.bool,

  /**
   * If `true` the handles can't be moved.
   */
  disabled: PropTypes.bool,

  /**
   * Disables handle move when clicking the slider bar
   */
  snapDragDisabled: PropTypes.bool,

  /**
   * Inverts the slider.
   */
  invert: PropTypes.bool,

  /**
   * Callback called before starting to move a handle.
   */
  onBeforeChange: PropTypes.func,

  /**
   * Callback called on every value change.
   */
  onChange: PropTypes.func,

  /**
   * Callback called only after moving a handle has ended.
   */
  onAfterChange: PropTypes.func,

  /**
   *  Callback called when the the slider is clicked (handle or bars).
   *  Receives the value at the clicked position as argument.
   */
  onSliderClick: PropTypes.func,
}
```
