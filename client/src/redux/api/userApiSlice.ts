import { apiSlice } from "./apiSlice";

export const userApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUser: builder.query({
      query: (userId) => {
        return {
          url: `users/${userId}`,
          method: "GET",
        };
      },
    }),
    update: builder.mutation({
      query: (data) => {
        return {
          url: `users/update/${data.id}`,
          method: "PUT",
          body: data,
        };
      },
    }),
    delete: builder.mutation({
      query: (data) => {
        return {
          url: `users/delete/${data}`,
          method: "DELETE",
          body: data,
        };
      },
    }),

    upgradePremium: builder.mutation({
      query: ({ amount = 0, method = "mock" }) => ({
        url: `payments/premium`,
        method: "POST",
        body: { amount, method },
      }),
    }),

    createSavedSearch: builder.mutation({
      query: (payload) => ({
        url: `saved-searches`,
        method: "POST",
        body: payload,
      }),
    }),
    getMySavedSearches: builder.query({
      query: () => ({
        url: `saved-searches/mine`,
        method: "GET",
      }),
    }),
    deleteSavedSearch: builder.mutation({
      query: (id) => ({
        url: `saved-searches/${id}`,
        method: "DELETE",
      }),
    }),
  }),
});

export const {
  useUpdateMutation,
  useDeleteMutation,
  useGetUserQuery,
  useUpgradePremiumMutation,
  useCreateSavedSearchMutation,
  useGetMySavedSearchesQuery,
  useDeleteSavedSearchMutation,
} = userApiSlice;
