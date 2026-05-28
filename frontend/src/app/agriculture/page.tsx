"use client"

import CrudDataTable, { CrudField } from "@/components/ui/crud-data-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function renderCell(col: string, row: any) {
  if (col === "water_quantity") {
    return <span className="font-medium text-zinc-100">{row[col] ?? "-"}</span>
  }
  if (col === "irrigation_date") {
    return <span className="text-zinc-400">{row[col] || "-"}</span>
  }
  return <span className="text-zinc-100">{row[col] ?? "-"}</span>
}

const farmsFields: CrudField[] = [
  { name: "farm_name", label: "اسم المزرعة", type: "text", required: true },
  { name: "location", label: "الموقع", type: "textarea", required: true },
]

const cropsFields: CrudField[] = [
  { name: "farm", label: "المزرعة", type: "select", fkEndpoint: "/agriculture/farms/", fkLabel: "farm_name", required: true },
  { name: "crop_name", label: "اسم المحصول", type: "text", required: true },
  { name: "season", label: "الموسم", type: "text", required: true },
]

const irrigationFields: CrudField[] = [
  { name: "crop", label: "المحصول", type: "select", fkEndpoint: "/agriculture/crops/", fkLabel: "crop_name", required: true },
  { name: "irrigation_date", label: "تاريخ الري", type: "date", required: true },
  { name: "water_quantity", label: "كمية الماء (م³)", type: "number", required: true },
]

export default function AgriculturePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">الزراعة</h1>
        <p className="text-sm text-zinc-500 mt-1">إدارة المزارع والمحاصيل وخطط الري</p>
      </div>

      <Tabs defaultValue="farms" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="farms">المزارع</TabsTrigger>
          <TabsTrigger value="crops">المحاصيل</TabsTrigger>
          <TabsTrigger value="irrigation-plans">خطط الري</TabsTrigger>
        </TabsList>

        <TabsContent value="farms">
          <CrudDataTable title="المزارع" endpoint="/agriculture/farms/"
            columns={["farm_name", "location"]}
            labels={{ farm_name: "اسم المزرعة", location: "الموقع" }}
            fields={farmsFields} renderCell={renderCell} />
        </TabsContent>
        <TabsContent value="crops">
          <CrudDataTable title="المحاصيل" endpoint="/agriculture/crops/"
            columns={["crop_name", "farm_name", "season"]}
            labels={{ crop_name: "اسم المحصول", farm_name: "المزرعة", season: "الموسم" }}
            fields={cropsFields} renderCell={renderCell} />
        </TabsContent>
        <TabsContent value="irrigation-plans">
          <CrudDataTable title="خطط الري" endpoint="/agriculture/irrigation-plans/"
            columns={["crop_name", "irrigation_date", "water_quantity"]}
            labels={{ crop_name: "المحصول", irrigation_date: "تاريخ الري", water_quantity: "كمية الماء (م³)" }}
            fields={irrigationFields} renderCell={renderCell} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
