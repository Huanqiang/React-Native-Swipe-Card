import React from 'react'
import PropTypes from 'prop-types'
import { StyleSheet, View, Text, Animated, PanResponder, Dimensions, Platform } from 'react-native'

const { width, height } = Dimensions.get('window')
const MIN_TOUCH_TIME = 100

const DIRECTION = {
  LEFT: 'left',
  RIGHT: 'right',
  TOP: 'top',
  BOTTOM: 'bottom'
}

export default class CardStack extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      drag: new Animated.ValueXY({ x: 0, y: 0 }),
      dragDistance: new Animated.Value(0),
      cards: [],
      cardA: null,
      cardB: null,
      topIndex: 1,
      topCard: 'cardA',
      touchStart: 0,
      swipedCards: []
    }
  }

  componentWillMount() {
    this.panResponder = PanResponder.create({
      // 要求成为响应者：
      onStartShouldSetPanResponder: (evt, gestureState) => true,
      onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => true,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,

      onPanResponderGrant: (evt, gestureState) => {
        this.props.handleCurCard(this.state.topIndex - 1)
        // 开始手势操作。
        this.setState({ touchStart: new Date().getTime() })
      },
      onPanResponderMove: (evt, gestureState) => {
        // 最近一次的移动距离为gestureState.move{X,Y}
        // 从成为响应者开始时的累计手势移动距离为gestureState.d{x,y}
        this.state.dragDistance.setValue(
          Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy)
        )
        this.state.drag.setValue({ x: gestureState.dx, y: gestureState.dy })
      },
      onPanResponderTerminationRequest: (evt, gestureState) => true,
      onPanResponderRelease: (evt, gestureState) => {
        // 用户放开了所有的触摸点，且此时视图已经成为了响应者。
        // 一般来说这意味着一个手势操作已经成功完成。
        const { verticalThreshold, horizontalThreshold } = this.props
        const swipeTotalTime = new Date().getTime() - this.state.touchStart
        if (Math.abs(gestureState.dx) > horizontalThreshold && swipeTotalTime > MIN_TOUCH_TIME) {
          const swipeDistance = gestureState.dx > 0 ? width : width * -1
          if (gestureState.dx > 0) {
            this.swipeToNextCard(DIRECTION.LEFT, swipeDistance, gestureState.dy, 200)
          } else if (gestureState.dx < 0) {
            this.swipeToNextCard(DIRECTION.RIGHT, swipeDistance, gestureState.dy, 200)
          } else {
            this.resetCard()
          }
        } else if (Math.abs(gestureState.dy) > verticalThreshold && swipeTotalTime > MIN_TOUCH_TIME) {
          const swipeDistance = gestureState.dy > 0 ? height : height * -1
          if (gestureState.dx > 0) {
            this.swipeToNextCard(DIRECTION.TOP, gestureState.dx, swipeDistance, 200)
          } else if (gestureState.dx < 0) {
            this.swipeToNextCard(DIRECTION.RIGHT, gestureState.dx, swipeDistance, 200)
          } else {
            this.resetCard()
          }
        } else {
          this.resetCard()
        }
      },
      onPanResponderTerminate: (evt, gestureState) => {
        // 另一个组件已经成为了新的响应者，所以当前手势将被取消。
      },
      onShouldBlockNativeResponder: (evt, gestureState) => {
        // 返回一个布尔值，决定当前组件是否应该阻止原生组件成为JS响应者
        // 默认返回true。目前暂时只支持android。
        return true
      }
    })
  }

  componentDidMount() {
    const { children } = this.props
    if (Array.isArray(children)) {
      this.setState({
        cards: children,
        cardA: children[0],
        cardB: children[1]
      })
    } else {
      this.setState({
        cards: [children],
        cardA: children,
        cardB: null
      })
    }
  }

  resetCard = () => {
    Animated.timing(this.state.dragDistance, {
      toValue: 0,
      duration: 200
    }).start()
    Animated.spring(this.state.drag, {
      toValue: { x: 0, y: 0 },
      duration: 200
    }).start()
  }

  goBack = (duration = 300) => {
    // const preTopCard = this.state.topCard === 'cardA' ? 'cardB' : 'cardA'
    // const preTopIndex = this.state.topIndex - 1
    // if (preTopIndex < 1) {
    //   console.log('已经是第一张了')
    //   return
    // }

    const swipedCard = this.state.swipedCards[this.state.swipedCards.length - 1]
    if (swipedCard === undefined) {
      return
    }

    const preCard = swipedCard.cardType === 'cardA' ? { cardA: swipedCard.card } : { cardB: swipedCard.card }

    this.setState(
      preState => ({
        ...preCard,
        topIndex: swipedCard.index + 1,
        topCard: swipedCard.cardType,
        swipedCards: preState.swipedCards.slice(0, this.state.swipedCards.length - 1)
      }),
      () => {
        this.state.dragDistance.setValue(swipedCard.dragDistance)
        this.state.drag.setValue({ x: swipedCard.position.x, y: swipedCard.position.y })

        Animated.spring(this.state.dragDistance, {
          toValue: 0,
          duration
        }).start()
        Animated.timing(this.state.drag, {
          toValue: { x: 0, y: 0 },
          duration: duration
        }).start()
      }
    )
  }

  swipeToNextCard = (direction, x, y, duration = 200) => {
    Animated.spring(this.state.dragDistance, {
      toValue: 220,
      duration
    }).start()
    Animated.timing(this.state.drag, {
      toValue: { x: x, y: y },
      duration: duration
    }).start(() => {
      // 记录当前被弹出的 card 的信息
      const swipedCard = {
        cardType: this.state.topCard,
        index: this.state.topIndex - 1,
        card: this.state.cards[this.state.topIndex - 1],
        position: { x: x, y: y },
        dragDistance: 220
      }

      const nextTopCard = this.state.topCard === 'cardA' ? 'cardB' : 'cardA'
      const topIndex = ++this.state.topIndex
      if (topIndex > this.state.cards.length + 1) {
        return
      }
      const updateCard =
        this.state.topCard === 'cardA' ? { cardA: this.state.cards[topIndex] } : { cardB: this.state.cards[topIndex] }

      this.setState(preState => ({
        ...updateCard,
        swipedCards: preState.swipedCards.concat(swipedCard),
        topIndex,
        topCard: nextTopCard
      }))
      this.state.dragDistance.setValue(0)
      this.state.drag.setValue({ x: 0, y: 0 })
    })
  }

  render() {
    let { drag, dragDistance, cardA, cardB, topCard } = this.state
    const scale = dragDistance.interpolate({
      inputRange: [0, 10, 220],
      outputRange: [0.95, 0.95, 1]
    })
    const rotate = drag.x.interpolate({
      inputRange: [-width, 0, width],
      outputRange: ['-15deg', '0deg', '15deg']
    })
    return (
      <View {...this.panResponder.panHandlers} style={[{ position: 'relative' }, this.props.style]}>
        {cardA !== 'undefined' ? (
          <Animated.View
            style={{
              position: 'absolute',
              ...Platform.select({
                ios: { zIndex: topCard === 'cardA' ? 3 : 2 },
                android: { elevation: topCard === 'cardA' ? 3 : 2 }
              }),
              transform: [
                { rotate: topCard === 'cardA' ? rotate : '0deg' },
                { translateX: topCard === 'cardA' ? drag.x : 0 },
                { translateY: topCard === 'cardA' ? drag.y : 0 },
                { scale: topCard === 'cardA' ? 1 : scale }
              ]
            }}
          >
            {cardA}
          </Animated.View>
        ) : null}
        {cardB !== 'undefined' ? (
          <Animated.View
            style={{
              position: 'absolute',
              ...Platform.select({
                ios: { zIndex: topCard === 'cardB' ? 3 : 2 },
                android: { elevation: topCard === 'cardB' ? 3 : 2 }
              }),
              transform: [
                { rotate: topCard === 'cardB' ? rotate : '0deg' },
                { translateX: topCard === 'cardB' ? drag.x : 0 },
                { translateY: topCard === 'cardB' ? drag.y : 0 },
                { scale: topCard === 'cardB' ? 1 : scale }
              ]
            }}
          >
            {cardB}
          </Animated.View>
        ) : null}

        {this.props.renderNoMoreCards()}
      </View>
    )
  }
}

CardStack.propTypes = {
  verticalThreshold: PropTypes.number,
  horizontalThreshold: PropTypes.number,
  renderNoMoreCards: PropTypes.func,
  handleCurCard: PropTypes.func
}

CardStack.defaultProps = {
  verticalThreshold: height / 4,
  horizontalThreshold: width / 2,
  renderNoMoreCards: () => <Text>没有了...</Text>,
  handleCurCard: () => {}
}
