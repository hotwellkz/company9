import React, { useState } from 'react';
import { Client } from '../../types/client';
import { ChevronDown, ChevronUp, ChevronRight, Building2, Wallet, CheckCircle2, Users, EyeOff, Eye } from 'lucide-react';

interface ClientListProps {
  clients: Client[];
  onContextMenu: (e: React.MouseEvent, client: Client) => void;
  onClientClick: (client: Client) => void;
  status: 'building' | 'deposit' | 'built' | 'all';
  onVisibilityChange: (client: Client, visible: boolean) => void;
}

export const ClientList: React.FC<ClientListProps> = ({ 
  clients, 
  onContextMenu,
  onClientClick,
  status,
  onVisibilityChange
}) => {
  const [isBuildingCollapsed, setIsBuildingCollapsed] = useState(false);
  const [isDepositCollapsed, setIsDepositCollapsed] = useState(false);
  const [isBuiltCollapsed, setIsBuiltCollapsed] = useState(false);

  const buildingClients = clients.filter(client => client.status === 'building');
  const depositClients = clients.filter(client => client.status === 'deposit');
  const builtClients = clients.filter(client => client.status === 'built');

  const handleVisibilityClick = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    onVisibilityChange(client, client.hideProjectIcon || false);
  };

  const renderClientGroup = (client: Client) => (
    <div
      key={client.id}
      className={`
        bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer
        border-l-4 mb-3
        ${client.status === 'building' ? 'border-emerald-500' : 
          client.status === 'deposit' ? 'border-amber-500' : 
          'border-blue-500'}
      `}
      onContextMenu={(e) => onContextMenu(e, client)}
      onClick={() => onClientClick(client)}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center
              ${client.status === 'building' ? 'bg-emerald-100' : 
                client.status === 'deposit' ? 'bg-amber-100' : 
                'bg-blue-100'}
            `}>
              {client.status === 'building' ? (
                <Building2 className="w-5 h-5 text-emerald-600" />
              ) : client.status === 'deposit' ? (
                <Wallet className="w-5 h-5 text-amber-600" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                {client.lastName} {client.firstName}
              </h3>
              <p className="text-sm text-gray-500">
                {client.clientNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={(e) => handleVisibilityClick(e, client)}
              className={`
                p-2 rounded-full transition-colors
                ${client.hideProjectIcon ? 
                  'bg-gray-100 hover:bg-gray-200' : 
                  'bg-emerald-100 hover:bg-emerald-200'}
              `}
              title={client.hideProjectIcon ? 'Показать иконку' : 'Скрыть иконку'}
            >
              {client.hideProjectIcon ? (
                <EyeOff className="w-4 h-4 text-gray-600" />
              ) : (
                <Eye className="w-4 h-4 text-emerald-600" />
              )}
            </button>
            <div className="flex flex-col items-end">
              <span className="text-sm text-gray-600">{client.phone}</span>
              <span className="text-sm text-gray-500">{client.constructionAddress}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Секция "Строим" */}
      {buildingClients.length > 0 && (
        <div>
          <div 
            className="flex items-center justify-between mb-4 cursor-pointer"
            onClick={() => setIsBuildingCollapsed(!isBuildingCollapsed)}
          >
            <div className="flex items-center gap-2">
              {isBuildingCollapsed ? (
                <ChevronRight className="w-5 h-5 text-emerald-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-emerald-600" />
              )}
              <h3 className="font-medium text-emerald-900 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Строим ({buildingClients.length})
              </h3>
            </div>
            <div className="text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              Активные проекты
            </div>
          </div>
          {!isBuildingCollapsed && (
            <div className="space-y-3">
              {buildingClients.map(client => renderClientGroup(client))}
            </div>
          )}
        </div>
      )}

      {/* Секция "Задаток" */}
      {depositClients.length > 0 && (
        <div>
          <div 
            className="flex items-center justify-between mb-4 cursor-pointer"
            onClick={() => setIsDepositCollapsed(!isDepositCollapsed)}
          >
            <div className="flex items-center gap-2">
              {isDepositCollapsed ? (
                <ChevronRight className="w-5 h-5 text-amber-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-amber-600" />
              )}
              <h3 className="font-medium text-amber-900 flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Задаток ({depositClients.length})
              </h3>
            </div>
            <div className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
              Ожидают строительства
            </div>
          </div>
          {!isDepositCollapsed && (
            <div className="space-y-3">
              {depositClients.map(client => renderClientGroup(client))}
            </div>
          )}
        </div>
      )}

      {/* Секция "Построено" */}
      {builtClients.length > 0 && (
        <div>
          <div 
            className="flex items-center justify-between mb-4 cursor-pointer"
            onClick={() => setIsBuiltCollapsed(!isBuiltCollapsed)}
          >
            <div className="flex items-center gap-2">
              {isBuiltCollapsed ? (
                <ChevronRight className="w-5 h-5 text-blue-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-blue-600" />
              )}
              <h3 className="font-medium text-blue-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Построено ({builtClients.length})
              </h3>
            </div>
            <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              Завершенные проекты
            </div>
          </div>
          {!isBuiltCollapsed && (
            <div className="space-y-3">
              {builtClients.map(client => renderClientGroup(client))}
            </div>
          )}
        </div>
      )}

      {clients.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Нет клиентов</h3>
          <p className="text-gray-500">
            {status === 'building' ? 'Нет активных проектов' :
             status === 'deposit' ? 'Нет клиентов с задатком' :
             status === 'built' ? 'Нет завершенных проектов' :
             'Список клиентов пуст'}
          </p>
        </div>
      )}
    </div>
  );
};