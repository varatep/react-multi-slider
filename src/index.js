import React, { PropTypes, Component } from 'react';

/**
 * To prevent text selection while dragging.
 * http://stackoverflow.com/questions/5429827/how-can-i-prevent-text-element-selection-with-cursor-drag
 */
function pauseEvent(e) {
  if (e.stopPropagation) e.stopPropagation();
  if (e.preventDefault) e.preventDefault();
  e.cancelBubble = true;
  e.returnValue = false;
  return false;
}

function stopPropagation(e) {
  if (e.stopPropagation) e.stopPropagation();
  e.cancelBubble = true;
}

/**
 * Spreads `count` values equally between `min` and `max`.
 */
function linspace(min, max, count) {
  const range = (max - min) / (count - 1);
  const res = [];
  for (let i = 0; i < count; i++) {
    res.push(min + range * i);
  }
  return res;
}

function ensureArray(x) {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

function undoEnsureArray(x) {
  return x && x.length === 1 ? x[0] : x;
}

// undoEnsureArray(ensureArray(x)) === x

class Slider extends Component {

  static propTypes = {
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
    className: React.PropTypes.string,

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

  static defaultProps = {
    min: 0,
    max: 100,
    step: 1,
    minDistance: 0,
    defaultValue: 0,
    orientation: 'horizontal',
    className: 'slider',
    handleClassName: 'handle',
    handleActiveClassName: 'active',
    barClassName: 'bar',
    withBars: false,
    pearling: false,
    disabled: false,
    snapDragDisabled: false,
    invert: false,
  }

  _getInitialState = () => {
    const {value, defaultValue} = this.props;

    const orValue = this._or(ensureArray(value), ensureArray(defaultValue));
    const zIndices = orValue.map((_, i) => i);
    const trimmedValue = orValue.map(v => this._trimAlignValue(v, this.props));

    return {
      zIndices,
      value: trimmedValue,
      index: -1,
      upperBound: 0,
      sliderLength: 0,
    };
  }

  constructor(props) {
    super(props);
    this.state = this._getInitialState();
  }

  // Keep the internal `value` consistent with an outside `value` if present.
  // This basically allows the slider to be a controlled component.
  componentWillReceiveProps(newProps) {
    const propsValue = ensureArray(newProps.value);
    const newValue = this._or(propsValue, this.state.value);
    this.state.value = newValue.map(v => this._trimAlignValue(v, newProps));

    // If an upperBound has not yet been determined (due to the component being hidden
    // during the mount event, or during the last resize), then calculate it now
    if (this.state.upperBound === 0) {
      this._handleResize();
    }
  }

  // Check if the arity of `value` or `defaultValue` matches the number of children (= number of custom handles).
  // If no custom handles are provided, just returns `value` if present and `defaultValue` otherwise.
  // If custom handles are present but neither `value` nor `defaultValue` are applicable the handles are spread out
  // equally.
  // TODO: better name? better solution?
  _or = (value, defaultValue) => {
    const {children, min, max} = this.props;

    const count = React.Children.count(children);

    switch (count) {
      case 0:
        return value.length > 0 ? value : defaultValue;
      case value.length:
        return value;
      case defaultValue.length:
        return defaultValue;
      default:
        return linspace(min, max, count);
    }
  }

  componentDidMount() {
    window.addEventListener('resize', this._handleResize);
    this._handleResize();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._handleResize);
  }

  getValue() {
    return undoEnsureArray(this.state.value);
  }

  _handleResize = () => {
    // setTimeout of 0 gives element enough time to have assumed its new size if it is being resized
    setImmediate(() => {
      const {invert} = this.props;
      const {slider, handle0} = this.refs;

      const sliderNode = slider.getDOMNode();
      const handleNode = handle0.getDOMNode();
      const rect = sliderNode.getBoundingClientRect();

      const sliderMax = rect[this._posMaxKey()];
      const sliderMin = rect[this._posMinKey()];

      const sizeKey = this._sizeKey();

      this.setState({
        upperBound: sliderNode[sizeKey] - handleNode[sizeKey],
        sliderLength: Math.abs(sliderMax - sliderMin),
        handleSize: handleNode[sizeKey],
        sliderStart: invert ? sliderMax : sliderMin,
      });
    });
  }

  // calculates the offset of a handle in pixels based on its value.
  _calcOffset = (value) => {
    const {min, max} = this.props;
    const {upperBound} = this.state;

    const ratio = (value - min) / (max - min);
    return ratio * upperBound;
  }

  // calculates the value corresponding to a given pixel offset, i.e. the inverse of `_calcOffset`.
  _calcValue = (offset) => {
    const {min, max} = this.props;
    const {upperBound} = this.state;

    const ratio = offset / upperBound;
    return ratio * (max - min) + min;
  }

  _buildHandleStyle = (offset, i) => {
    const {index, zIndices} = this.state;
    const posMinKey = this._posMinKey();

    return {
      position: 'absolute',
      willChange: index >= 0 ? posMinKey : '',
      zIndex: zIndices.indexOf(i) + 1,
      [posMinKey]: `${offset}px`,
    };
  }

  _buildBarStyle = (min, max) => {
    const {index} = this.state;
    const posMinKey = this._posMinKey();
    const posMaxKey = this._posMaxKey();

    return {
      position: 'absolute',
      willChange: index >= 0 ? `${posMinKey}, ${posMaxKey}` : '',
      [posMinKey]: min,
      [posMaxKey]: max,
    };
  }

  _getClosestIndex = (pixelOffset) => {
    const {value} = this.state;

    let minDist = Number.MAX_VALUE;
    let closestIndex = -1;

    for (let [i, v] of value.entries()) {
      const offset = this._calcOffset(v);
      const dist = Math.abs(pixelOffset - offset);

      if (dist <= minDist) {
        minDist = dist;
        closestIndex = i;
      }
    }

    return closestIndex;
  }

  _calcOffsetFromPosition = (position) => {
    const {invert} = this.props;
    const {sliderStart, sliderLength, handleSize} = this.state;

    let pixelOffset = position - sliderStart;
    if (invert) pixelOffset = sliderLength - pixelOffset;
    pixelOffset -= (handleSize / 2);

    return pixelOffset;
  }

  // Snaps the nearest handle to the value corresponding to `position` and calls `callback` with that handle's index.
  _forceValueFromPosition = (position, callback) => {
    const {minDistance} = this.props;

    const pixelOffset = this._calcOffsetFromPosition(position);
    const closestIndex = this._getClosestIndex(pixelOffset);
    const nextValue = this._trimAlignValue(this._calcValue(pixelOffset));

    const value = [...this.state.value]; // Clone this.state.value since we'll modify it temporarily
    value[closestIndex] = nextValue;

    // Prevents the slider from shrinking below `props.minDistance`
    for (let [i] of value.entries()) {
      if (value[i + 1] - value[i] < minDistance) return;
    }

    this.setState({value}, () => callback(closestIndex));
  }

  _getMousePosition= (e) => {
    return [
      e[`page${this._axisKey()}`],
      e[`page${this._orthogonalAxisKey()}`],
    ];
  }

  _getTouchPosition = (e) => {
    const touch = e.touches[0];
    return [
      touch[`page${this._axisKey()}`],
      touch[`page${this._orthogonalAxisKey()}`],
    ];
  }

  _getMouseEventMap = () => {
    return [
      ['mousemove', this._onMouseMove],
      ['mouseup', this._onMouseUp],
    ];
  }

  _getTouchEventMap = () => {
    return [
      ['touchmove', this._onTouchMove],
      ['touchend', this._onTouchEnd],
    ];
  }

  // create the `mousedown` handler for the i-th handle
  _createOnMouseDown = (i) => {
    return e => {
      if (this.props.disabled) return;

      const [position] = this._getMousePosition(e);
      this._start(i, position);
      this._addHandlers(this._getMouseEventMap());

      pauseEvent(e);
    };
  }

  // create the `touchstart` handler for the i-th handle
  _createOnTouchStart = (i) => {
    return e => {
      if (this.props.disabled || e.touches.length > 1) return;

      const position = this._getTouchPosition(e);

      this.startPosition = position;
      this.isScrolling = undefined; // don't know yet if the user is trying to scroll

      this._start(i, position[0]);
      this._addHandlers(this._getTouchEventMap());

      stopPropagation(e);
    };
  }

  _addHandlers = (eventMap) => {
    for (let [key, func] of eventMap) {
      document.addEventListener(key, func, false);
    }
  }

  _removeHandlers = (eventMap) => {
    for (let [key, func] of eventMap) {
      document.removeEventListener(key, func, false);
    }
  }

  _start = (index, startPosition) => {
    const {zIndices, value} = this.state;

    // if activeElement is body window will lost focus in IE9
    if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }

    this.hasMoved = false;

    this._fireChangeEvent('onBeforeChange');

    zIndices.splice(zIndices.indexOf(index), 1); // remove wherever the element is
    zIndices.push(index); // add to end

    this.setState({
      index,
      zIndices,
      startPosition,
      startValue: value[index],
    });
  }

  _onMouseUp = () => {
    this._onEnd(this._getMouseEventMap());
  }

  _onTouchEnd = () => {
    this._onEnd(this._getTouchEventMap());
  }

  _onEnd = (eventMap) => {
    this._removeHandlers(eventMap);
    this.setState({index: -1}, () => this._fireChangeEvent('onAfterChange'));
  }

  _onMouseMove = (e) => {
    const [position] = this._getMousePosition(e);
    this._move(position);
  }

  _onTouchMove = (e) => {
    if (e.touches.length > 1) return;

    const [positionMainDir, positionScrollDir] = this._getTouchPosition(e);
    const [startPositionMainDir, startPositionScrollDir] = this.startPosition;

    if (typeof this.isScrolling === 'undefined') {
      const diffMainDir = positionMainDir - startPositionMainDir;
      const diffScrollDir = positionScrollDir - startPositionScrollDir;
      this.isScrolling = Math.abs(diffScrollDir) > Math.abs(diffMainDir);
    }

    if (this.isScrolling) {
      this.setState({index: -1});
      return;
    }

    pauseEvent(e);

    this._move(positionMainDir);
  }

  _move = (position) => {
    this.hasMoved = true;

    const {props, state} = this;
    const {min, max, minDistance} = props;
    const {index, value, startPosition, sliderLength, handleSize, startValue} = state;

    const {length} = value;
    const oldValue = value[index];

    let diffPosition = position - startPosition;
    if (props.invert) diffPosition *= -1;

    const diffValue = diffPosition / (sliderLength - handleSize) * (max - min);

    let newValue = this._trimAlignValue(startValue + diffValue);

    // if "pearling" (= handles pushing each other) is disabled,
    // prevent the handle from getting closer than `minDistance` to the previous or next handle.
    if (!props.pearling) {
      if (index > 0) {
        const valueBefore = value[index - 1];
        if (newValue < valueBefore + minDistance) {
          newValue = valueBefore + minDistance;
        }
      }

      if (index < length - 1) {
        const valueAfter = value[index + 1];
        if (newValue > valueAfter - minDistance) {
          newValue = valueAfter - minDistance;
        }
      }
    }

    value[index] = newValue;

    // if "pearling" is enabled, let the current handle push the pre- and succeeding handles.
    if (props.pearling && length > 1) {
      if (newValue > oldValue) {
        this._pushSucceeding(value, minDistance, index);
        this._trimSucceeding(length, value, minDistance, max);
      } else if (newValue < oldValue) {
        this._pushPreceding(value, minDistance, index);
        this._trimPreceding(length, value, minDistance, min);
      }
    }

    // Normally you would use `shouldComponentUpdate`, but since the slider is a low-level component,
    // the extra complexity might be worth the extra performance.
    if (newValue !== oldValue) {
      this.setState({value}, this._fireChangeEvent.bind(this, 'onChange'));
    }
  }

  _pushSucceeding = (value, minDistance, index) => {
    for (let i = index, padding = value[i] + minDistance;
         value[i + 1] && padding > value[i + 1];
         i++, padding = value[i] + minDistance) {
      value[i + 1] = this._alignValue(padding);
    }
  }

  _trimSucceeding = (length, nextValue, minDistance, max) => {
    for (let i = 0; i < length; i++) {
      let padding = max - i * minDistance;
      if (nextValue[length - 1 - i] > padding) {
        nextValue[length - 1 - i] = padding;
      }
    }
  }

  _pushPreceding = (value, minDistance, index) => {
    for (let i = index, padding = value[i] - minDistance;
         value[i - 1] && padding < value[i - 1];
         i--, padding = value[i] - minDistance) {
      value[i - 1] = this._alignValue(padding);
    }
  }

  _trimPreceding = (length, nextValue, minDistance, min) => {
    for (let i = 0; i < length; i++) {
      let padding = min + i * minDistance;
      if (nextValue[i] < padding) {
        nextValue[i] = padding;
      }
    }
  }

  _axisKey = () => {
    const {orientation} = this.props;
    if (orientation === 'horizontal') return 'X';
    if (orientation === 'vertical') return 'Y';
  }

  _orthogonalAxisKey = () => {
    const {orientation} = this.props;
    if (orientation === 'horizontal') return 'Y';
    if (orientation === 'vertical') return 'X';
  }

  _posMinKey = () => {
    const {orientation, invert} = this.props;
    if (orientation === 'horizontal') return invert ? 'right' : 'left';
    if (orientation === 'vertical') return invert ? 'bottom' : 'top';
  }

  _posMaxKey = () => {
    const {orientation, invert} = this.props;
    if (orientation === 'horizontal') return invert ? 'left' : 'right';
    if (orientation === 'vertical') return invert ? 'top' : 'bottom';
  }

  _sizeKey = () => {
    const {orientation} = this.props;
    if (orientation === 'horizontal') return 'clientWidth';
    if (orientation === 'vertical') return 'clientHeight';
  }

  _trimAlignValue = (val, props) => {
    return this._alignValue(this._trimValue(val, props), props);
  }

  _trimValue = (val, props) => {
    const {min, max} = props || this.props;

    if (val <= min) return min;
    if (val >= max) return max;

    return val;
  }

  _alignValue = (val, props) => {
    const {min, step} = props || this.props;

    const valModStep = (val - min) % step;

    let alignValue = val - valModStep;
    if (Math.abs(valModStep) * 2 >= step) {
      alignValue += valModStep > 0 ? step : -step;
    }

    return parseFloat(alignValue.toFixed(5));
  }

  _renderHandle = (style, child, i) => {
    const {handleClassName, handleActiveClassName} = this.props;
    const {index} = this.state;

    const isActive = index === i ? handleActiveClassName : '';
    const className = `${handleClassName} ${handleClassName}-${i} ${isActive}`;

    return (
      <div
        key={`handle-${i}`}
        ref={`handle${i}`}
        className={className}
        style={style}
        onMouseDown={this._createOnMouseDown(i)}
        onTouchStart={this._createOnTouchStart(i)}
        >
        {child}
      </div>
    );
  }

  _renderHandles = (offset) => {
    const {children} = this.props;

    const styles = offset.map(this._buildHandleStyle);

    if (React.Children.count(children) > 0) {
      return React.Children.forEach(children, (child, i) => this._renderHandle(styles[i], child, i));
    }

    return styles.map(((style, i) => this._renderHandle(style, null, i)));
  }

  _renderBar = (i, offsetFrom, offsetTo) => {
    const {barClassName} = this.props;
    const {upperBound} = this.state;

    const className = `${barClassName} ${barClassName}-${i}`;
    const style = this._buildBarStyle(offsetFrom, upperBound - offsetTo);

    return (
      <div
        key={`bar-${i}`}
        ref={`bar${i}`}
        className={className}
        style={style}
        />
    );
  }

  _renderBars = (offset) => {
    const {upperBound} = this.state;

    const lastIndex = offset.length - 1;

    const firstBar = this._renderBar(0, 0, offset[0]);
    const lastBar = this._renderBar(lastIndex + 1, offset[lastIndex], upperBound);
    const bars = offset
      .filter((o, i) => i !== lastIndex)
      .map((o, i) => this._renderBar(i + 1, o, offset[i + 1]));

    return [firstBar, ...bars, lastBar];
  }

  _onSliderMouseDown = (e) => {
    const {disabled, snapDragDisabled} = this.props;
    if (disabled) return;

    this.hasMoved = false;

    if (!snapDragDisabled) {
      const [position] = this._getMousePosition(e);
      this._forceValueFromPosition(position, i => {
        this._fireChangeEvent('onChange');
        this._start(i, position);
        this._addHandlers(this._getMouseEventMap());
      });
    }

    pauseEvent(e);
  }

  _onSliderClick = (e) => {
    const {disabled, onSliderClick} = this.props;
    if (disabled) return;

    if (onSliderClick && !this.hasMoved) {
      const position = this._getMousePosition(e);
      const valueAtPos = this._trimAlignValue(this._calcValue(this._calcOffsetFromPosition(position[0])));
      onSliderClick(valueAtPos);
    }
  }

  _fireChangeEvent = (eventType) => {
    const {value} = this.state;
    const callback = this.props[eventType];
    if (callback) {
      callback(undoEnsureArray(value));
    }
  }

  render() {
    const {className, disabled, withBars} = this.props;
    const {value} = this.state;

    const offset = value.map(this._calcOffset);
    const bars = withBars ? this._renderBars(offset) : null;
    const handles = this._renderHandles(offset);

    return (
      <div
        ref="slider"
        style={{position: 'relative'}}
        className={className + (disabled ? ' disabled' : '')}
        onMouseDown={this._onSliderMouseDown}
        onClick={this._onSliderClick}
        >
        {bars}
        {handles}
      </div>
    );
  }
}

export default Slider;
