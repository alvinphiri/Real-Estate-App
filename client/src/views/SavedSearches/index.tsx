import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Grid,
  TextField,
  FormControlLabel,
  Checkbox,
} from "@mui/material";

import { Heading, SubHeading } from "../../components/Heading";
import useTypedSelector from "../../hooks/useTypedSelector";
import {
  selectedUserPremiumStatus,
  selectedUserRole,
} from "../../redux/auth/authSlice";
import {
  useCreateSavedSearchMutation,
  useDeleteSavedSearchMutation,
  useGetMySavedSearchesQuery,
} from "../../redux/api/userApiSlice";

const SavedSearches = () => {
  const isPremium = useTypedSelector(selectedUserPremiumStatus);
  const role = useTypedSelector(selectedUserRole);

  const { data: searchesData, refetch } = useGetMySavedSearchesQuery(undefined, {
    skip: !isPremium || role !== "tenant",
  });

  const [createSavedSearch, { isLoading: creating }] =
    useCreateSavedSearchMutation();
  const [deleteSavedSearch] = useDeleteSavedSearchMutation();

  const searches = useMemo(() => searchesData?.data || [], [searchesData]);

  const [form, setForm] = useState<any>({
    name: "My Saved Search",
    location: "",
    minRent: "",
    maxRent: "",
    minBedrooms: "",
    amenities: {
      solar: false,
      borehole: false,
      security: false,
      parking: false,
      internet: false,
    },
  });

  const submit = async () => {
    const payload = {
      name: form.name,
      criteria: {
        location: form.location,
        minRent: Number(form.minRent || 0),
        maxRent: Number(form.maxRent || 0),
        minBedrooms: Number(form.minBedrooms || 0),
        amenities: form.amenities,
      },
    };

    await createSavedSearch(payload);
    await refetch();
  };

  if (role !== "tenant") {
    return (
      <Box sx={{ marginTop: "50px", padding: "0 20px" }}>
        <Heading>Saved Searches</Heading>
        <Box sx={{ marginTop: "10px" }}>
          Only tenant accounts can use saved searches.
        </Box>
      </Box>
    );
  }

  if (!isPremium) {
    return (
      <Box sx={{ marginTop: "50px", padding: "0 20px" }}>
        <Heading>Saved Searches</Heading>
        <Box sx={{ marginTop: "10px" }}>
          Premium feature. Upgrade in your Profile to enable saved searches.
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ marginTop: "50px", padding: "0 20px" }}>
      <Heading>Saved Searches</Heading>

      <Box sx={{ marginTop: "20px", background: "#fff", padding: "15px", borderRadius: "6px" }}>
        <SubHeading sx={{ marginBottom: "10px" }}>Create</SubHeading>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              label="Location / Area"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Min Rent"
              type="number"
              value={form.minRent}
              onChange={(e) => setForm({ ...form, minRent: e.target.value })}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Max Rent"
              type="number"
              value={form.maxRent}
              onChange={(e) => setForm({ ...form, maxRent: e.target.value })}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Min Beds"
              type="number"
              value={form.minBedrooms}
              onChange={(e) => setForm({ ...form, minBedrooms: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={10}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
              <FormControlLabel
                control={<Checkbox checked={form.amenities.solar} />}
                label="Solar"
                onChange={(e: any) =>
                  setForm({
                    ...form,
                    amenities: { ...form.amenities, solar: e.target.checked },
                  })
                }
              />
              <FormControlLabel
                control={<Checkbox checked={form.amenities.borehole} />}
                label="Borehole"
                onChange={(e: any) =>
                  setForm({
                    ...form,
                    amenities: { ...form.amenities, borehole: e.target.checked },
                  })
                }
              />
              <FormControlLabel
                control={<Checkbox checked={form.amenities.security} />}
                label="Security"
                onChange={(e: any) =>
                  setForm({
                    ...form,
                    amenities: { ...form.amenities, security: e.target.checked },
                  })
                }
              />
              <FormControlLabel
                control={<Checkbox checked={form.amenities.parking} />}
                label="Parking"
                onChange={(e: any) =>
                  setForm({
                    ...form,
                    amenities: { ...form.amenities, parking: e.target.checked },
                  })
                }
              />
              <FormControlLabel
                control={<Checkbox checked={form.amenities.internet} />}
                label="Internet"
                onChange={(e: any) =>
                  setForm({
                    ...form,
                    amenities: { ...form.amenities, internet: e.target.checked },
                  })
                }
              />
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" onClick={submit} disabled={creating}>
              Save Search
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ marginTop: "20px", background: "#fff", padding: "15px", borderRadius: "6px" }}>
        <SubHeading sx={{ marginBottom: "10px" }}>Your Saved Searches</SubHeading>
        {searches.length === 0 ? (
          <Box>No saved searches yet.</Box>
        ) : (
          searches.map((s: any) => (
            <Box
              key={s._id}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <Box>
                <Box sx={{ fontWeight: 600 }}>{s.name}</Box>
                <Box sx={{ fontSize: "13px", color: "#475569" }}>
                  {s.criteria?.location ? `Loc: ${s.criteria.location} · ` : ""}
                  {s.criteria?.minRent ? `Min: ${s.criteria.minRent} · ` : ""}
                  {s.criteria?.maxRent ? `Max: ${s.criteria.maxRent} · ` : ""}
                  {s.criteria?.minBedrooms ? `Beds: ${s.criteria.minBedrooms}` : ""}
                </Box>
              </Box>
              <Button
                variant="outlined"
                onClick={async () => {
                  await deleteSavedSearch(s._id);
                  await refetch();
                }}
              >
                Delete
              </Button>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};

export default SavedSearches;
