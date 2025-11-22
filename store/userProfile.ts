/**
 * User Profile Store
 * Manages user preferences, learned patterns, and Unity project settings
 */

import { create } from 'zustand'
import { persist, type StorageValue } from 'zustand/middleware'
import storage from '@/utils/Storage'
import { omitBy, isFunction } from 'lodash-es'

interface UserProfileStore extends UserProfile {
  // Actions
  update: (values: Partial<UserProfile>) => void
  updateProject: (projectId: string, updates: Partial<UnityProject>) => void
  addProject: (project: UnityProject) => void
  removeProject: (projectId: string) => void
  setActiveProject: (projectId: string) => void
  addErrorSolution: (error: string, solution: string, context: string) => void
  updateCodeStyle: (codeStyle: Partial<UserProfile['codeStyle']>) => void
  updateStats: (stats: Partial<UserProfile['stats']>) => void
  recordFeedback: (score: number) => void
  getActiveProject: () => UnityProject | undefined
  reset: () => void
}

const defaultUserProfile: UserProfile = {
  name: '',
  experience: 'intermediate',
  unityVersion: '6.0',

  hardware: {
    os: 'Windows 11',
    cpu: '13th Gen Intel Core',
    ram: '32GB',
    gpu: {
      model: 'RTX 3060',
      vram: 6,
    },
  },

  codeStyle: {
    namingConventions: {
      classes: [],
      methods: [],
      variables: [],
      properties: [],
    },
    formatting: {
      indentation: 4,
      bracesStyle: 'new-line',
      usingNewlines: true,
    },
    architecturePreferences: [],
    commonComponents: [],
    errorHistory: [],
  },

  projects: [],

  stats: {
    totalConversations: 0,
    commonQueries: [],
    preferredModel: 'gemini',
    feedbackScores: [],
    averageFeedback: 0,
    lastUpdated: Date.now(),
  },

  preferences: {
    autoIndexing: true,
    patternLearning: true,
    codeStyleAnalysis: true,
    hardwareOptimization: true,
  },
}

export const useUserProfileStore = create(
  persist<UserProfileStore>(
    (set, get) => ({
      ...defaultUserProfile,

      update: (values) =>
        set((state) => ({
          ...state,
          ...values,
          stats: {
            ...state.stats,
            lastUpdated: Date.now(),
          },
        })),

      updateProject: (projectId, updates) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId
              ? { ...project, ...updates }
              : project,
          ),
        })),

      addProject: (project) =>
        set((state) => ({
          projects: [...state.projects, project],
        })),

      removeProject: (projectId) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== projectId),
        })),

      setActiveProject: (projectId) =>
        set(() => ({
          // Store active project ID in settings store
        })),

      addErrorSolution: (error, solution, context) =>
        set((state) => ({
          codeStyle: {
            ...state.codeStyle,
            errorHistory: [
              ...state.codeStyle.errorHistory,
              {
                error,
                solution,
                timestamp: Date.now(),
                context,
              },
            ],
          },
        })),

      updateCodeStyle: (codeStyle) =>
        set((state) => ({
          codeStyle: {
            ...state.codeStyle,
            ...codeStyle,
          },
        })),

      updateStats: (stats) =>
        set((state) => ({
          stats: {
            ...state.stats,
            ...stats,
            lastUpdated: Date.now(),
          },
        })),

      recordFeedback: (score) =>
        set((state) => {
          const newScores = [...state.stats.feedbackScores, score]
          const average =
            newScores.reduce((sum, s) => sum + s, 0) / newScores.length

          return {
            stats: {
              ...state.stats,
              feedbackScores: newScores,
              averageFeedback: average,
              lastUpdated: Date.now(),
            },
          }
        }),

      getActiveProject: () => {
        const state = get()
        // Get active project ID from settings
        // For now, return first project
        return state.projects[0]
      },

      reset: () => set(defaultUserProfile),
    }),
    {
      name: 'unity-user-profile',
      version: 1,
      storage: {
        getItem: async (key: string) => {
          return await storage.getItem<StorageValue<UserProfileStore>>(key)
        },
        setItem: async (key: string, store: StorageValue<UserProfileStore>) => {
          return await storage.setItem(key, {
            state: omitBy(store.state, (item) => isFunction(item)),
            version: store.version,
          })
        },
        removeItem: async (key: string) => await storage.removeItem(key),
      },
    },
  ),
)
