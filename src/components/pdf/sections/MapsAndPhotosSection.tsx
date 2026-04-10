// components/pdf/sections/MapsAndPhotosSection.tsx

import { Image, StyleSheet,Text, View } from "@react-pdf/renderer";

import { ReportData } from "@/lib/reports/types";

import { SectionHeader } from "../SectionHeader";
import { baseStyles } from "../SharedStyles";

export function MapsAndPhotosSection({ data }: { data: ReportData }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = (data as any).mapsAndPhotos || {};
  const hasAnyPhoto = m.frontPhotoUrl || m.streetMapUrl || m.aerialPhotoUrl || m.mockupPhotoUrl;

  if (!hasAnyPhoto) {
    return (
      <View style={baseStyles.section}>
        <SectionHeader data={data} title="Maps & Property Photos" />
        <Text style={baseStyles.value}>No property photos available for this report.</Text>
      </View>
    );
  }

  return (
    <View style={baseStyles.section}>
      <SectionHeader data={data} title="Maps & Property Photos" />

      <View style={styles.row}>
        {m.frontPhotoUrl && (
          <View style={styles.block}>
            <Text style={styles.caption}>Front Elevation</Text>
            <Image src={m.frontPhotoUrl} style={styles.image} />
          </View>
        )}
        {m.streetMapUrl && (
          <View style={styles.block}>
            <Text style={styles.caption}>Street View / Map</Text>
            <Image src={m.streetMapUrl} style={styles.image} />
          </View>
        )}
      </View>

      <View style={styles.row}>
        {m.aerialPhotoUrl && (
          <View style={styles.block}>
            <Text style={styles.caption}>Aerial Overview</Text>
            <Image src={m.aerialPhotoUrl} style={styles.image} />
          </View>
        )}
        {m.mockupPhotoUrl && (
          <View style={styles.block}>
            <Text style={styles.caption}>AI Mockup (Proposed)</Text>
            <Image src={m.mockupPhotoUrl} style={styles.image} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  block: {
    flex: 1,
    marginRight: 8,
  },
  image: {
    width: "100%",
    height: 140,
    objectFit: "cover",
    marginTop: 4,
  },
  caption: {
    fontSize: 9,
    fontWeight: "bold",
  },
});
