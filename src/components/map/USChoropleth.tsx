"use client";

import { useCallback, useState, memo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { scaleQuantize } from "d3-scale";
import { useRouter } from "next/navigation";
import ColorLegend from "./ColorLegend";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// FIPS code → state abbreviation
const FIPS_TO_STATE: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
  "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
  "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
  "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
  "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
  "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
  "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
  "56": "WY",
};

interface StateData {
  state: string;
  rate: number;
  count: number;
  population: number;
}

interface Props {
  data: StateData[];
  offenseLabel: string;
}

const COLORS = [
  "#1a1a2e", "#16213e", "#0f3460", "#1a5276",
  "#1f6f8b", "#2e86ab", "#e77f67", "#e55039",
  "#eb2f06", "#b71540",
];

function USChoropleth({ data, offenseLabel }: Props) {
  const router = useRouter();
  const [tooltip, setTooltip] = useState<{
    name: string;
    rate: number;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  const dataMap = new Map(data.map((d) => [d.state, d]));
  const rates = data.map((d) => d.rate).filter((r) => r > 0);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);

  const colorScale = scaleQuantize<string>()
    .domain([minRate, maxRate])
    .range(COLORS);

  const handleClick = useCallback(
    (geo: any) => {
      const fips = geo.id;
      const abbr = FIPS_TO_STATE[fips];
      if (abbr) router.push(`/state/${abbr}`);
    },
    [router]
  );

  return (
    <div className="relative">
      <ComposableMap projection="geoAlbersUsa" className="w-full h-auto">
        <ZoomableGroup>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const fips = geo.id;
                const abbr = FIPS_TO_STATE[fips];
                const d = abbr ? dataMap.get(abbr) : undefined;
                const rate = d?.rate || 0;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={rate > 0 ? colorScale(rate) : "#1a1a2e"}
                    stroke="#2a2a4a"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "#f5c542", cursor: "pointer" },
                      pressed: { outline: "none" },
                    }}
                    onClick={() => handleClick(geo)}
                    onMouseEnter={(evt) => {
                      if (d) {
                        setTooltip({
                          name: abbr || "",
                          rate: d.rate,
                          count: d.count,
                          x: evt.clientX,
                          y: evt.clientY,
                        });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {tooltip && (
        <div
          className="fixed z-50 rounded-lg bg-card border border-border px-3 py-2 text-sm shadow-lg pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
        >
          <p className="font-semibold">{tooltip.name}</p>
          <p className="text-muted-foreground">
            {offenseLabel}: {tooltip.rate.toFixed(1)} per 100k
          </p>
          <p className="text-muted-foreground">
            {tooltip.count.toLocaleString()} total
          </p>
        </div>
      )}

      <ColorLegend min={minRate} max={maxRate} colors={COLORS} label={`${offenseLabel} rate per 100k`} />
    </div>
  );
}

export default memo(USChoropleth);
