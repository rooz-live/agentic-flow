declare module '@deck.gl/react' {
  import { Component } from 'react';
  export default class DeckGL extends Component<any, any> {}
  export * from '@deck.gl/core';
}

declare module '@deck.gl/core' {
  export class Layer<PropsT = any> {
    constructor(props: PropsT);
  }
  export const COORDINATE_SYSTEM: any;
}

declare module '@deck.gl/layers' {
  import { Layer } from '@deck.gl/core';
  export class ScatterplotLayer extends Layer {}
  export class ArcLayer extends Layer {}
  export class HeatmapLayer extends Layer {}
  export class PointCloudLayer extends Layer {}
  export class TextLayer extends Layer {}
  export class PathLayer extends Layer {}
  export class LineLayer extends Layer {}
}

declare module '@deck.gl/aggregation-layers' {
  import { Layer } from '@deck.gl/core';
  export class HexagonLayer extends Layer {}
  export class ContourLayer extends Layer {}
  export class GridLayer extends Layer {}
}

declare module '@deck.gl/geo-layers' {
  import { Layer } from '@deck.gl/core';
  export class TileLayer extends Layer {}
  export class TripsLayer extends Layer {}
}
