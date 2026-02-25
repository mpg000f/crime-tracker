declare module "react-simple-maps" {
  import { ComponentType, ReactNode } from "react";

  interface ComposableMapProps {
    projection?: string;
    projectionConfig?: Record<string, any>;
    className?: string;
    children?: ReactNode;
  }
  export const ComposableMap: ComponentType<ComposableMapProps>;

  interface ZoomableGroupProps {
    center?: [number, number];
    zoom?: number;
    children?: ReactNode;
  }
  export const ZoomableGroup: ComponentType<ZoomableGroupProps>;

  interface GeographiesProps {
    geography: string | Record<string, any>;
    children: (args: { geographies: any[] }) => ReactNode;
  }
  export const Geographies: ComponentType<GeographiesProps>;

  interface GeographyProps {
    geography: any;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: { default?: React.CSSProperties; hover?: React.CSSProperties; pressed?: React.CSSProperties };
    onClick?: (event: any) => void;
    onMouseEnter?: (event: React.MouseEvent) => void;
    onMouseLeave?: (event: React.MouseEvent) => void;
    className?: string;
  }
  export const Geography: ComponentType<GeographyProps>;

  interface MarkerProps {
    coordinates: [number, number];
    children?: ReactNode;
  }
  export const Marker: ComponentType<MarkerProps>;
}
