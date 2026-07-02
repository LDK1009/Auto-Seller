//////////////////////////////////////// Emotion transient props 옵션 ////////////////////////////////////////
// styled(컴포넌트) 대상은 Emotion이 prop을 자동 필터링하지 않아 `$` prefix prop이 DOM까지 전달된다.
// styled(Component, transientOptions)<{ $foo }>() 형태로 사용해 `$` prop의 DOM 전파를 차단한다.
// (styled.div 등 HTML 태그 대상은 자동 필터링되므로 불필요)

export const transientOptions = {
  shouldForwardProp: (propName: string) => !propName.startsWith('$'),
};
