/**
 * Unity Netcode Helper Plugin
 * Provides multiplayer networking code templates and patterns
 */

import type { ToolDefinition } from '@/types/plugin'

const toolDefinition: ToolDefinition = {
  name: 'netcodeHelper',
  description: 'Generate Unity Netcode templates for multiplayer games including NetworkBehaviour, RPCs, and sync variables',
  parameters: {
    type: 'object',
    properties: {
      templateType: {
        type: 'string',
        enum: ['NetworkBehaviour', 'ServerRPC', 'ClientRPC', 'NetworkVariable', 'NetworkManager', 'PlayerController'],
        description: 'Type of networking template to generate',
      },
      className: {
        type: 'string',
        description: 'Name of the class to generate',
      },
      features: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional features to include (e.g., "movement", "combat", "inventory")',
      },
    },
    required: ['templateType', 'className'],
  },
}

async function handler(params: {
  templateType: string
  className: string
  features?: string[]
}): Promise<any> {
  const { templateType, className, features = [] } = params

  const templates: Record<string, string> = {
    NetworkBehaviour: `using Unity.Netcode;
using UnityEngine;

public class ${className} : NetworkBehaviour
{
    // Network variables sync automatically
    private NetworkVariable<int> ${className.toLowerCase()}Value = new NetworkVariable<int>(0,
        NetworkVariableReadPermission.Everyone,
        NetworkVariableWritePermission.Server);

    public override void OnNetworkSpawn()
    {
        if (IsServer)
        {
            ${className.toLowerCase()}Value.Value = 0;
        }

        ${className.toLowerCase()}Value.OnValueChanged += OnValueChanged;
    }

    public override void OnNetworkDespawn()
    {
        ${className.toLowerCase()}Value.OnValueChanged -= OnValueChanged;
    }

    private void OnValueChanged(int previousValue, int newValue)
    {
        Debug.Log($"Value changed from {previousValue} to {newValue}");
    }

    [ServerRpc(RequireOwnership = false)]
    public void UpdateValueServerRpc(int newValue)
    {
        ${className.toLowerCase()}Value.Value = newValue;
    }
}`,

    ServerRPC: `[ServerRpc(RequireOwnership = false)]
public void ${className}ServerRpc(/* parameters */)
{
    if (!IsServer) return;

    // Server-side logic here
    Debug.Log("Server RPC called");

    // Optionally notify clients
    ${className}ClientRpc(/* parameters */);
}`,

    ClientRPC: `[ClientRpc]
public void ${className}ClientRpc(/* parameters */)
{
    // This runs on all clients
    Debug.Log("Client RPC called");
}`,

    NetworkVariable: `private NetworkVariable<float> ${className.toLowerCase()} = new NetworkVariable<float>(
    0f,
    NetworkVariableReadPermission.Everyone,
    NetworkVariableWritePermission.Server
);

private void Start()
{
    ${className.toLowerCase()}.OnValueChanged += On${className}Changed;
}

private void OnDestroy()
{
    ${className.toLowerCase()}.OnValueChanged -= On${className}Changed;
}

private void On${className}Changed(float previous, float current)
{
    Debug.Log($"${className} changed from {previous} to {current}");
}`,

    NetworkManager: `using Unity.Netcode;
using UnityEngine;

public class ${className} : MonoBehaviour
{
    private NetworkManager networkManager;

    private void Start()
    {
        networkManager = NetworkManager.Singleton;
    }

    public void StartHost()
    {
        networkManager.StartHost();
        Debug.Log("Started as Host");
    }

    public void StartServer()
    {
        networkManager.StartServer();
        Debug.Log("Started as Server");
    }

    public void StartClient()
    {
        networkManager.StartClient();
        Debug.Log("Started as Client");
    }

    public void Shutdown()
    {
        networkManager.Shutdown();
        Debug.Log("Network shutdown");
    }
}`,

    PlayerController: `using Unity.Netcode;
using UnityEngine;

public class ${className} : NetworkBehaviour
{
    [SerializeField] private float moveSpeed = 5f;
    private NetworkVariable<Vector3> networkPosition = new NetworkVariable<Vector3>();

    private void Update()
    {
        if (!IsOwner)
        {
            transform.position = networkPosition.Value;
            return;
        }

        // Get input
        float horizontal = Input.GetAxis("Horizontal");
        float vertical = Input.GetAxis("Vertical");

        Vector3 movement = new Vector3(horizontal, 0, vertical) * moveSpeed * Time.deltaTime;
        transform.position += movement;

        // Update network position
        if (IsServer)
        {
            networkPosition.Value = transform.position;
        }
        else
        {
            UpdatePositionServerRpc(transform.position);
        }
    }

    [ServerRpc]
    private void UpdatePositionServerRpc(Vector3 position)
    {
        networkPosition.Value = position;
    }
}`,
  }

  try {
    let code = templates[templateType] || templates.NetworkBehaviour

    // Add features
    if (features.includes('movement')) {
      code += '\n\n// Movement logic would go here'
    }
    if (features.includes('combat')) {
      code += '\n\n// Combat system would go here'
    }

    return {
      success: true,
      code,
      templateType,
      className,
      description: `Generated ${templateType} template for multiplayer networking`,
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to generate template: ${error}`,
    }
  }
}

export default {
  id: 'netcode-helper',
  ...toolDefinition,
  handler,
}
