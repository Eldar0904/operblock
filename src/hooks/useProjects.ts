import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, type ApiMember, type MembersResponse } from "@/lib/api";
import { MOCK_DAILY_PROJECT, MOCK_PROJECT, type ApiProject } from "@/lib/mock-data";

export function useProjects() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["projects"],
    queryFn: async (): Promise<ApiProject[]> => {
      try {
        const token = await getToken();
        return await api.getProjects(token);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 503 || err.status >= 500)) {
          return [MOCK_PROJECT];
        }
        if (err instanceof TypeError) {
          return [MOCK_PROJECT];
        }
        throw err;
      }
    },
    retry: false,
  });
}

export function useDailyProject() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["projects", "daily"],
    queryFn: async (): Promise<ApiProject> => {
      try {
        const token = await getToken();
        return await api.getDailyProject(token);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 503 || err.status >= 500)) {
          return MOCK_DAILY_PROJECT;
        }
        if (err instanceof TypeError) {
          return MOCK_DAILY_PROJECT;
        }
        throw err;
      }
    },
    retry: false,
  });
}

export function useMembers() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["members"],
    queryFn: async (): Promise<MembersResponse> => {
      try {
        const token = await getToken();
        return await api.getMembers(token);
      } catch {
        return { members: [], maxUsers: 6, teamFull: false };
      }
    },
    retry: false,
    staleTime: 60_000,
  });
}

export function useMembersList(): ApiMember[] {
  const { data } = useMembers();
  return data?.members ?? [];
}

export function useCreateProject() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; portfolioId?: string | null }) => {
      const token = await getToken();
      return api.createProject(token, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      portfolioId?: string | null;
      status?: ApiProject["status"];
      isPrivate?: boolean;
    }) => {
      const token = await getToken();
      return api.updateProject(token, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteProject() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.deleteProject(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
